"use client";

import { useEffect, useRef, useState } from 'react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  animation?: 'fade-up' | 'fade-right' | 'fade-left' | 'zoom-in';
  delay?: number;
  className?: string;
}

export default function AnimatedSection({ 
  children, 
  animation = 'fade-up', 
  delay = 0,
  className = ''
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return (
    <div 
      ref={ref} 
      className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} ${className}`}
      data-aos={animation}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
