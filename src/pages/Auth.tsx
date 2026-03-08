import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Sparkles, Shield, Zap } from 'lucide-react';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signIn, signUp } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/';

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  const validateInputs = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
    
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please verify your email address before signing in.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
      navigate(redirectTo, { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
    
    setIsSubmitting(true);
    const { error } = await signUp(email, password, fullName);
    setIsSubmitting(false);
    
    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('An account with this email already exists. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created! Please check your email to verify your account.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-background p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Chief of Staff AI</h1>
              <p className="text-sm text-muted-foreground">Executive Operating System</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Enterprise Security</h3>
              <p className="text-sm text-muted-foreground">
                Bank-grade encryption, role-based access control, and complete audit trails.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">AI-Powered Automation</h3>
              <p className="text-sm text-muted-foreground">
                Six specialized agents working 24/7 to execute your vision with precision.
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          © 2024 Chief of Staff AI. Enterprise-grade AI for executive teams.
        </p>
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md bg-card/50 backdrop-blur border-border">
          <CardHeader className="text-center">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold">Chief of Staff AI</span>
            </div>
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>
              Sign in to your executive dashboard or create an account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showForgotPassword ? (
              <div className="space-y-4">
                {forgotSent ? (
                  <div className="text-center space-y-4 py-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Check your email for a password reset link.
                    </p>
                    <Button variant="outline" onClick={() => { setShowForgotPassword(false); setForgotSent(false); }} className="w-full">
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="ceo@company.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={isSubmitting}
                      onClick={async () => {
                        if (!forgotEmail) {
                          toast.error('Enter your email');
                          return;
                        }
                        setIsSubmitting(true);
                        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        setIsSubmitting(false);
                        if (error) {
                          toast.error(error.message);
                        } else {
                          setForgotSent(true);
                        }
                      }}
                    >
                      {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : 'Send Reset Link'}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowForgotPassword(false)} className="w-full">
                      Back to Sign In
                    </Button>
                  </>
                )}
              </div>
            ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="ceo@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? 'border-destructive' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="signin-password">Password</Label>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={errors.password ? 'border-destructive' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="ceo@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? 'border-destructive' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={errors.password ? 'border-destructive' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
