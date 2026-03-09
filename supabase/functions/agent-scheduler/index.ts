import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledTask {
  id: string;
  organization_id: string;
  agent_id: string | null;
  created_by: string;
  name: string;
  task_type: string;
  task_config: Record<string, unknown>;
  frequency: string;
  cron_expression: string | null;
  timezone: string;
  scheduled_at: string;
  next_run_at: string | null;
  status: string;
  priority: number;
  max_retries: number;
  retry_count: number;
  execution_count: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { action, taskId, taskData } = await req.json();

    switch (action) {
      case 'process_due': return await processDueTasks(supabase);
      case 'execute_task': return await executeTask(supabase, taskId);
      case 'create': return await createScheduledTask(supabase, taskData);
      case 'pause': return await updateTaskStatus(supabase, taskId, 'paused');
      case 'resume': return await resumeTask(supabase, taskId);
      case 'cancel': return await updateTaskStatus(supabase, taskId, 'completed');
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Agent scheduler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── Process all due tasks ───────────────────────────────────────────
async function processDueTasks(supabase: ReturnType<typeof createClient>) {
  const now = new Date().toISOString();

  // Fetch active tasks whose next_run_at has passed
  const { data: dueTasks, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('status', 'active')
    .lte('next_run_at', now)
    .order('priority', { ascending: true })
    .limit(50);

  if (error) throw error;
  if (!dueTasks || dueTasks.length === 0) {
    return jsonResponse({ processed: 0, message: 'No due tasks' });
  }

  // Check kill switch per org
  const orgIds = [...new Set(dueTasks.map((t: ScheduledTask) => t.organization_id))];
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, kill_switch_active')
    .in('id', orgIds);

  const blockedOrgs = new Set(
    (orgs || []).filter((o: { kill_switch_active: boolean }) => o.kill_switch_active).map((o: { id: string }) => o.id)
  );

  const results: Array<{ taskId: string; status: string; error?: string }> = [];

  for (const task of dueTasks as ScheduledTask[]) {
    if (blockedOrgs.has(task.organization_id)) {
      results.push({ taskId: task.id, status: 'blocked_kill_switch' });
      continue;
    }

    try {
      await executeSingleTask(supabase, task);
      results.push({ taskId: task.id, status: 'executed' });
    } catch (err) {
      results.push({ taskId: task.id, status: 'error', error: err.message });
    }
  }

  return jsonResponse({ processed: results.length, results });
}

// ─── Execute a single task ───────────────────────────────────────────
async function executeTask(supabase: ReturnType<typeof createClient>, taskId: string) {
  const { data: task, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error || !task) throw new Error('Task not found');

  await executeSingleTask(supabase, task as ScheduledTask);
  return jsonResponse({ success: true, taskId });
}

async function executeSingleTask(supabase: ReturnType<typeof createClient>, task: ScheduledTask) {
  const startedAt = new Date();

  // Create execution record
  const { data: execution, error: execError } = await supabase
    .from('schedule_executions')
    .insert({
      scheduled_task_id: task.id,
      organization_id: task.organization_id,
      agent_id: task.agent_id,
      status: 'running',
      started_at: startedAt.toISOString(),
      input_data: task.task_config,
    })
    .select()
    .single();

  if (execError) throw execError;

  try {
    let result: Record<string, unknown> = {};

    // Route by task type
    switch (task.task_type) {
      case 'command':
        result = await executeCommandTask(supabase, task);
        break;
      case 'action_pipeline':
        result = await executeActionPipelineTask(supabase, task);
        break;
      case 'workflow':
        result = await executeWorkflowTask(supabase, task);
        break;
      case 'notification':
        result = await executeNotificationTask(supabase, task);
        break;
      case 'data_sync':
        result = await executeDataSyncTask(supabase, task);
        break;
      case 'report':
        result = await executeReportTask(supabase, task);
        break;
      default:
        throw new Error(`Unknown task type: ${task.task_type}`);
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    // Update execution as success
    await supabase
      .from('schedule_executions')
      .update({
        status: 'completed',
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        output_data: result,
      })
      .eq('id', execution.id);

    // Calculate next run
    const nextRun = calculateNextRun(task);

    // Update task
    await supabase
      .from('scheduled_tasks')
      .update({
        last_run_at: completedAt.toISOString(),
        next_run_at: nextRun,
        execution_count: task.execution_count + 1,
        last_execution_result: result,
        last_error: null,
        retry_count: 0,
        status: task.frequency === 'once' ? 'completed' : 'active',
      })
      .eq('id', task.id);

    // Audit log
    await writeAuditEntry(supabase, task, 'schedule.executed', {
      execution_id: execution.id,
      duration_ms: durationMs,
      result_summary: result,
    });

  } catch (error) {
    const completedAt = new Date();
    const newRetryCount = task.retry_count + 1;
    const isFinalFailure = newRetryCount >= task.max_retries;

    // Update execution as failed
    await supabase
      .from('schedule_executions')
      .update({
        status: 'failed',
        completed_at: completedAt.toISOString(),
        duration_ms: completedAt.getTime() - startedAt.getTime(),
        error_message: error.message,
      })
      .eq('id', execution.id);

    // Update task
    await supabase
      .from('scheduled_tasks')
      .update({
        retry_count: newRetryCount,
        last_error: error.message,
        last_run_at: completedAt.toISOString(),
        status: isFinalFailure ? 'failed' : 'active',
        // Retry with exponential backoff
        next_run_at: isFinalFailure
          ? null
          : new Date(Date.now() + Math.pow(2, newRetryCount) * 60000).toISOString(),
      })
      .eq('id', task.id);

    // Create alert notification on final failure
    if (isFinalFailure) {
      await supabase.from('notifications').insert({
        organization_id: task.organization_id,
        user_id: task.created_by,
        title: `Scheduled task failed: ${task.name}`,
        body: `Task exhausted ${task.max_retries} retries. Last error: ${error.message}`,
        category: 'agent_alert',
        priority: 'high',
        source_type: 'scheduler',
        source_id: task.id,
        icon: '⚠️',
      });
    }

    await writeAuditEntry(supabase, task, 'schedule.failed', {
      execution_id: execution.id,
      error: error.message,
      retry_count: newRetryCount,
      is_final: isFinalFailure,
    });

    throw error;
  }
}

// ─── Task Type Executors ─────────────────────────────────────────────

async function executeCommandTask(supabase: ReturnType<typeof createClient>, task: ScheduledTask) {
  const config = task.task_config as { command_text?: string };
  if (!config.command_text) throw new Error('No command_text in task config');

  const { data, error } = await supabase
    .from('commands')
    .insert({
      organization_id: task.organization_id,
      user_id: task.created_by,
      command_text: `[Scheduled: ${task.name}] ${config.command_text}`,
      status: 'queued',
      priority: task.priority,
    })
    .select()
    .single();

  if (error) throw error;

  // Trigger process-command to actually execute the command through the AI pipeline
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  try {
    const processResponse = await fetch(`${supabaseUrl}/functions/v1/process-command`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ commandId: data.id }),
    });

    if (processResponse.ok) {
      const processResult = await processResponse.json();
      return { command_id: data.id, command_text: config.command_text, processed: true, result: processResult };
    } else {
      const errText = await processResponse.text();
      console.error(`process-command failed for scheduled command ${data.id}:`, errText);
      return { command_id: data.id, command_text: config.command_text, processed: false, error: errText };
    }
  } catch (err) {
    console.error(`process-command call error for ${data.id}:`, err);
    return { command_id: data.id, command_text: config.command_text, processed: false, error: (err as Error).message };
  }
}

async function executeActionPipelineTask(supabase: ReturnType<typeof createClient>, task: ScheduledTask) {
  const config = task.task_config as {
    action_type?: string;
    action_description?: string;
    action_params?: Record<string, unknown>;
    category?: string;
  };

  const { data, error } = await supabase
    .from('action_pipeline')
    .insert({
      organization_id: task.organization_id,
      created_by: task.created_by,
      agent_id: task.agent_id,
      action_type: config.action_type || 'scheduled_task',
      action_description: config.action_description || `Scheduled: ${task.name}`,
      action_params: config.action_params || {},
      category: config.category || 'system',
      status: 'created',
      risk_level: 'low',
    })
    .select()
    .single();

  if (error) throw error;
  return { action_pipeline_id: data.id };
}

async function executeWorkflowTask(supabase: ReturnType<typeof createClient>, task: ScheduledTask) {
  const config = task.task_config as { workflow_id?: string };
  if (!config.workflow_id) throw new Error('No workflow_id in task config');

  // Trigger execute-workflow to actually run the workflow through the AI reasoning engine
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    const execResponse = await fetch(`${supabaseUrl}/functions/v1/execute-workflow`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'execute',
        workflowId: config.workflow_id,
      }),
    });

    if (execResponse.ok) {
      const execResult = await execResponse.json();
      return { workflow_id: config.workflow_id, triggered: true, executed: true, result: execResult };
    } else {
      const errText = await execResponse.text();
      console.error(`execute-workflow failed for ${config.workflow_id}:`, errText);
      // Still update timestamp as fallback
      await supabase
        .from('workflows')
        .update({ last_executed_at: new Date().toISOString() })
        .eq('id', config.workflow_id);
      return { workflow_id: config.workflow_id, triggered: true, executed: false, error: errText };
    }
  } catch (err) {
    console.error(`execute-workflow call error for ${config.workflow_id}:`, err);
    await supabase
      .from('workflows')
      .update({ last_executed_at: new Date().toISOString() })
      .eq('id', config.workflow_id);
    return { workflow_id: config.workflow_id, triggered: true, executed: false, error: (err as Error).message };
  }
}

async function executeNotificationTask(supabase: ReturnType<typeof createClient>, task: ScheduledTask) {
  const config = task.task_config as {
    title?: string;
    body?: string;
    category?: string;
    priority?: string;
    target_user_id?: string;
  };

  const { error } = await supabase.from('notifications').insert({
    organization_id: task.organization_id,
    user_id: config.target_user_id || task.created_by,
    title: config.title || task.name,
    body: config.body || task.description || '',
    category: config.category || 'system',
    priority: config.priority || 'normal',
    source_type: 'scheduler',
    source_id: task.id,
    icon: '📅',
  });

  if (error) throw error;
  return { notified: true };
}

async function executeDataSyncTask(supabase: ReturnType<typeof createClient>, task: ScheduledTask) {
  const config = task.task_config as { integration_id?: string };

  if (config.integration_id) {
    await supabase
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', config.integration_id);
  }

  return { synced: true, integration_id: config.integration_id };
}

async function executeReportTask(supabase: ReturnType<typeof createClient>, task: ScheduledTask) {
  const config = task.task_config as { report_type?: string; scope?: string; metrics?: string[] };
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

  let reportContent = `Scheduled ${config.report_type || 'general'} report has been generated.`;

  // Generate actual AI-powered report
  if (lovableApiKey) {
    try {
      // Gather org stats for the report
      const [clientsRes, pipelineRes, emailsRes, commandsRes] = await Promise.all([
        supabase.from('clients').select('id, name, status, mrr, risk_of_churn, health_score', { count: 'exact' }).eq('organization_id', task.organization_id),
        supabase.from('action_pipeline').select('id, status, category, risk_level', { count: 'exact' }).eq('organization_id', task.organization_id),
        supabase.from('emails').select('id, status', { count: 'exact' }).eq('organization_id', task.organization_id),
        supabase.from('commands').select('id, status', { count: 'exact' }).eq('organization_id', task.organization_id),
      ]);

      const stats = {
        total_clients: clientsRes.count || 0,
        active_clients: clientsRes.data?.filter(c => c.status === 'active').length || 0,
        total_mrr: clientsRes.data?.reduce((s, c) => s + (c.mrr || 0), 0) || 0,
        high_risk_clients: clientsRes.data?.filter(c => c.risk_of_churn === 'high' || c.risk_of_churn === 'critical').length || 0,
        avg_health: clientsRes.data?.length ? Math.round(clientsRes.data.reduce((s, c) => s + (c.health_score || 0), 0) / clientsRes.data.length) : 0,
        pipeline_total: pipelineRes.count || 0,
        pipeline_completed: pipelineRes.data?.filter(p => p.status === 'completed').length || 0,
        pipeline_failed: pipelineRes.data?.filter(p => p.status === 'failed').length || 0,
        emails_sent: emailsRes.data?.filter(e => e.status === 'sent').length || 0,
        commands_total: commandsRes.count || 0,
      };

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: `You are an executive analyst for a ${config.report_type || 'general'} report. Generate a concise, actionable executive summary with key metrics, trends, risks, and recommendations. Use bullet points and bold for emphasis. Keep it under 500 words.` },
            { role: 'user', content: `Generate a ${config.report_type || 'general'} report.\nScope: ${config.scope || 'all'}\nMetrics focus: ${(config.metrics || []).join(', ') || 'all'}\n\nData: ${JSON.stringify(stats)}` },
          ],
          temperature: 0.4,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        reportContent = aiData.choices?.[0]?.message?.content || reportContent;
      }
    } catch (err) {
      console.error('AI report generation error:', err);
    }
  }

  // Create a notification with the actual report content
  await supabase.from('notifications').insert({
    organization_id: task.organization_id,
    user_id: task.created_by,
    title: `📊 Report: ${task.name}`,
    body: reportContent.substring(0, 2000),
    category: 'system',
    priority: 'normal',
    source_type: 'scheduler',
    source_id: task.id,
    icon: '📊',
    metadata: { report_type: config.report_type, full_report: reportContent },
  });

  return { report_type: config.report_type, generated: true, ai_generated: !!lovableApiKey, report_length: reportContent.length };
}

// ─── Scheduling Logic ────────────────────────────────────────────────

function calculateNextRun(task: ScheduledTask): string | null {
  const now = new Date();

  switch (task.frequency) {
    case 'once':
      return null;
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'monthly': {
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      return next.toISOString();
    }
    case 'cron':
      // For cron, calculate next from expression (simplified: default to daily)
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}

// ─── CRUD Helpers ────────────────────────────────────────────────────

async function createScheduledTask(supabase: ReturnType<typeof createClient>, taskData: Record<string, unknown>) {
  const scheduledAt = taskData.scheduled_at as string || new Date().toISOString();
  const nextRunAt = taskData.next_run_at as string || scheduledAt;

  const { data, error } = await supabase
    .from('scheduled_tasks')
    .insert({
      ...taskData,
      scheduled_at: scheduledAt,
      next_run_at: nextRunAt,
    })
    .select()
    .single();

  if (error) throw error;

  await writeAuditEntry(supabase, data as ScheduledTask, 'schedule.created', {
    name: data.name,
    frequency: data.frequency,
    scheduled_at: data.scheduled_at,
  });

  return jsonResponse({ success: true, task: data });
}

async function updateTaskStatus(supabase: ReturnType<typeof createClient>, taskId: string, status: string) {
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .update({ status, next_run_at: status === 'paused' ? null : undefined })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return jsonResponse({ success: true, task: data });
}

async function resumeTask(supabase: ReturnType<typeof createClient>, taskId: string) {
  const { data: task, error: fetchErr } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (fetchErr || !task) throw new Error('Task not found');

  const nextRun = calculateNextRun(task as ScheduledTask) || new Date().toISOString();

  const { data, error } = await supabase
    .from('scheduled_tasks')
    .update({ status: 'active', next_run_at: nextRun, retry_count: 0, last_error: null })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return jsonResponse({ success: true, task: data });
}

// ─── Audit ───────────────────────────────────────────────────────────

async function writeAuditEntry(
  supabase: ReturnType<typeof createClient>,
  task: ScheduledTask,
  action: string,
  details: Record<string, unknown>
) {
  try {
    const { data: seqData } = await supabase.rpc('next_audit_sequence', { p_org_id: task.organization_id });
    const { data: prevHash } = await supabase.rpc('latest_audit_hash', { p_org_id: task.organization_id });

    const seq = seqData || 1;
    const prev = prevHash || 'GENESIS';
    const detailsJson = details as Record<string, unknown>;

    const { data: hashData } = await supabase.rpc('generate_audit_hash', {
      p_org_id: task.organization_id,
      p_event_type: 'scheduler',
      p_action: action,
      p_details: detailsJson,
      p_previous_hash: prev,
      p_timestamp: new Date().toISOString(),
    });

    await supabase.from('audit_log').insert({
      organization_id: task.organization_id,
      event_type: 'scheduler',
      action,
      actor_type: 'agent',
      actor_id: task.agent_id,
      resource_type: 'scheduled_task',
      resource_id: task.id,
      details: detailsJson,
      sequence_number: seq,
      event_hash: hashData || 'HASH_ERROR',
      previous_hash: prev,
    });
  } catch (e) {
    console.error('Audit write failed:', e);
  }
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
