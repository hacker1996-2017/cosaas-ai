import { useParams, useSearchParams } from 'react-router-dom';
import { ClientChatWidget } from '@/components/chat/ClientChatWidget';

export default function ClientChat() {
  const { orgId } = useParams<{ orgId: string }>();
  const [searchParams] = useSearchParams();
  const orgName = searchParams.get('name') || undefined;

  if (!orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'hsl(222 47% 6%)', color: 'hsl(220 20% 93%)' }}
      >
        <p className="text-sm opacity-60">Invalid chat link.</p>
      </div>
    );
  }

  return <ClientChatWidget organizationId={orgId} orgName={orgName} />;
}