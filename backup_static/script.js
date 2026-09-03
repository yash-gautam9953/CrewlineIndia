document.addEventListener('DOMContentLoaded', () => {
    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileLinks = document.querySelectorAll('.mobile-nav a');

    mobileMenuBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
        const icon = mobileMenuBtn.querySelector('i');
        if (mobileNav.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-xmark');
        } else {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            const icon = mobileMenuBtn.querySelector('i');
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        });
    });

    // Simple scroll animation using Intersection Observer
    const animateElements = document.querySelectorAll('[data-aos]');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Determine animation based on data-aos attribute
                const animation = entry.target.getAttribute('data-aos');
                const delay = entry.target.getAttribute('data-aos-delay') || 0;
                
                entry.target.style.transition = `all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${delay}ms`;
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translate(0, 0) scale(1)';
                
                // Stop observing once animated
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Initial state for animated elements
    animateElements.forEach(el => {
        const animation = el.getAttribute('data-aos');
        el.style.opacity = '0';
        
        switch(animation) {
            case 'fade-up':
                el.style.transform = 'translateY(40px)';
                break;
            case 'fade-right':
                el.style.transform = 'translateX(-40px)';
                break;
            case 'fade-left':
                el.style.transform = 'translateX(40px)';
                break;
            case 'zoom-in':
                el.style.transform = 'scale(0.9)';
                break;
            default:
                el.style.transform = 'translateY(20px)';
        }
        
        observer.observe(el);
    });
});
