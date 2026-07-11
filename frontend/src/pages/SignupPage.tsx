import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../utils/axios.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Mail, GraduationCap, Loader, School } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'faculty', 'visitor', 'staff']),
  campusId: z.string().min(1, 'Please select your campus'),
});

type SignupFields = z.infer<typeof signupSchema>;

export const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [campuses, setCampuses] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFields>({
    resolver: zodResolver(signupSchema)
  });

  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const res = await api.get('/campuses');
        setCampuses(res.data.data);
      } catch (e) {
        console.error('Failed to load campuses');
      }
    };
    fetchCampuses();
  }, []);

  const onSubmit = async (data: SignupFields) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signup(data);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-dark)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="card card-glow" style={{ width: '100%', maxWidth: '460px', padding: '40px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Get Started</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
            Register your profile to submit and resolve incidents
          </p>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--status-open)',
            padding: '12px',
            borderRadius: 'var(--border-radius)',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '15px' }} />
              <input
                type="text"
                className="form-control"
                placeholder="John Doe"
                style={{ paddingLeft: '48px' }}
                {...register('name')}
              />
            </div>
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '15px' }} />
              <input
                type="email"
                className="form-control"
                placeholder="name@university.edu"
                style={{ paddingLeft: '48px' }}
                {...register('email')}
              />
            </div>
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '15px' }} />
              <input
                type="password"
                className="form-control"
                placeholder="Min 6 characters"
                style={{ paddingLeft: '48px' }}
                {...register('password')}
              />
            </div>
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          <div className="grid-2" style={{ marginBottom: '0px', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Campus</label>
              <div style={{ position: 'relative' }}>
                <School size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '15px' }} />
                <select
                  className="form-control"
                  style={{ paddingLeft: '48px', appearance: 'none' }}
                  {...register('campusId')}
                >
                  <option value="">Select Campus</option>
                  {campuses.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {errors.campusId && <p className="form-error">{errors.campusId.message}</p>}
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Role</label>
              <div style={{ position: 'relative' }}>
                <GraduationCap size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '15px' }} />
                <select
                  className="form-control"
                  style={{ paddingLeft: '48px', appearance: 'none' }}
                  {...register('role')}
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="visitor">Visitor</option>
                  <option value="staff">Staff/Resolver</option>
                </select>
              </div>
              {errors.role && <p className="form-error">{errors.role.message}</p>}
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: '12px' }}>
            {submitting ? <Loader className="spin" size={18} /> : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Login</Link>
        </div>
      </div>
      <style>{`
        .spin { animation: spin-anim 1s linear infinite; }
        @keyframes spin-anim { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
