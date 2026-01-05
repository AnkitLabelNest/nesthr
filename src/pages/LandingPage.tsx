import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import Footer from '@/components/layout/Footer';
import { 
  Clock, 
  Calendar, 
  Users, 
  BarChart3, 
  FileText, 
  Layers,
  Shield,
  Zap,
  Database,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const features = [
  { 
    icon: Clock, 
    title: 'Smart Attendance Management', 
    description: 'Real-time tracking and regularization' 
  },
  { 
    icon: Calendar, 
    title: 'Leave Management', 
    description: 'Seamless approval workflows' 
  },
  { 
    icon: Users, 
    title: 'Employee Self-Service', 
    description: 'Empower your workforce' 
  },
  { 
    icon: BarChart3, 
    title: 'Advanced Analytics', 
    description: 'Data-driven insights' 
  },
  { 
    icon: FileText, 
    title: 'Document Management', 
    description: 'Secure and organized' 
  },
  { 
    icon: Layers, 
    title: 'Modular & Scalable', 
    description: 'Built for growth' 
  },
];

const trustIndicators = [
  { 
    icon: Database, 
    title: 'Built for Big Data Companies',
    description: 'Handle massive datasets with enterprise-grade infrastructure'
  },
  { 
    icon: Shield, 
    title: 'Enterprise-Grade Security',
    description: 'Your data is protected with industry-leading security'
  },
  { 
    icon: Zap, 
    title: 'Trusted by Data Teams',
    description: 'Designed by data professionals, for data professionals'
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const featuresRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1 }
    );

    if (featuresRef.current) observer.observe(featuresRef.current);
    if (trustRef.current) observer.observe(trustRef.current);

    return () => observer.disconnect();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message || 'Login failed');
    } else {
      toast.success('Welcome back!');
      navigate('/app');
    }
    setSubmitting(false);
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HERO SECTION - Split Screen (Full Viewport) */}
      <div className="min-h-screen flex flex-col lg:flex-row relative">
        {/* LEFT SIDE - Login Form (40%) */}
        <div className="lg:w-[40%] flex flex-col justify-center px-8 py-12 lg:px-16 bg-card shadow-xl relative z-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-10">
            <img 
              src="/labelnest-logo.jpg" 
              alt="NestHR" 
              className="h-12 w-auto rounded-lg shadow-md"
            />
            <div>
              <span className="font-display font-bold text-2xl text-foreground">NestHR</span>
              <span className="text-xs text-muted-foreground block">by LabelNest</span>
            </div>
          </Link>

          {/* Login Form */}
          <div className="max-w-sm">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground mb-8">Sign in to your account</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-10"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <a href="#" className="text-sm text-primary hover:underline">
                  Forgot Password?
                </a>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <a href="#" className="text-primary font-medium hover:underline">
                Contact Admin
              </a>
            </p>
          </div>
        </div>

        {/* RIGHT SIDE - Branding (60%) */}
        <div className="lg:w-[60%] bg-gradient-to-br from-[#2563eb] to-[#1e40af] text-white px-8 py-12 lg:px-16 lg:py-20 flex flex-col justify-center relative">
          <div className="max-w-xl mx-auto space-y-8">
            {/* Hero Content */}
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-4xl lg:text-5xl font-display font-bold leading-tight">
                NestHR
              </h2>
              <p className="text-xl text-blue-100 font-medium mb-2">Enterprise HRMS by LabelNest</p>
              <p className="text-lg text-blue-100 leading-relaxed">
                We believe one size doesn't fit all when it comes to data. We're building a world where every organization, big or small, can access data that truly fits their needs: locally grounded, globally scalable, and built with purpose.
              </p>
            </div>

            {/* Vision Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
              <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-300" />
                Our Vision
              </h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                To become India's most trusted modular data backbone - powering innovation through clean, connected, and contextual data.
              </p>
            </div>
          </div>

          {/* Scroll Down Indicator */}
          <button 
            onClick={scrollToFeatures}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors cursor-pointer animate-bounce"
          >
            <span className="text-sm font-medium">Explore More</span>
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* WHAT WE OFFER SECTION */}
      <div 
        id="features-section"
        ref={featuresRef}
        className={`py-20 px-8 lg:px-16 bg-background transition-all duration-700 ${
          visibleSections.has('features-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-display font-bold text-foreground text-center mb-4">
            What We Offer
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Comprehensive HR solutions designed to streamline your workforce management
          </p>

          {/* 3x2 Feature Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={feature.title}
                  className={`p-6 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group cursor-default ${
                    visibleSections.has('features-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                  }`}
                  style={{ 
                    transitionDelay: visibleSections.has('features-section') ? `${index * 100}ms` : '0ms'
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* TRUST INDICATORS SECTION */}
      <div 
        id="trust-section"
        ref={trustRef}
        className={`py-20 px-8 lg:px-16 bg-[#f0f7ff] transition-all duration-700 ${
          visibleSections.has('trust-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {trustIndicators.map((indicator, index) => {
              const Icon = indicator.icon;
              return (
                <div 
                  key={indicator.title}
                  className={`text-center transition-all duration-500 ${
                    visibleSections.has('trust-section') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                  }`}
                  style={{ 
                    transitionDelay: visibleSections.has('trust-section') ? `${index * 150}ms` : '0ms'
                  }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">{indicator.title}</h3>
                  <p className="text-muted-foreground text-sm">{indicator.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;
