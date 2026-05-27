document.addEventListener('DOMContentLoaded', () => {
    const footerMount = document.getElementById('site-footer');
    const existingFooter = document.querySelector('footer');
    if (footerMount || existingFooter) {
        fetch('footer.html')
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to load footer');
                }
                return response.text();
            })
            .then((html) => {
                if (footerMount) {
                    footerMount.innerHTML = html;
                } else if (existingFooter) {
                    existingFooter.outerHTML = html;
                }
            })
            .catch(() => {
                // Keep page usable even if footer include fails
            });
    }

    // Sticky Header
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }
    });

    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileBtn.querySelector('i').classList.toggle('fa-bars');
            mobileBtn.querySelector('i').classList.toggle('fa-times');
        });
    }

    // Mobile Dropdown Toggle
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                }
            });
        }
    });

    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Animation on Scroll (Basic)
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.service-card, .adv-item, .about-content, .ev-hub').forEach(el => {
        observer.observe(el);
    });

    // Testimonials Slider
    const testimonialsSlider = document.querySelector('.testimonials-slider');
    if (testimonialsSlider) {
        const slides = testimonialsSlider.querySelectorAll('.testimonial-slide');
        const dots = testimonialsSlider.querySelectorAll('.slider-dot');
        const prevBtn = testimonialsSlider.querySelector('.slider-prev');
        const nextBtn = testimonialsSlider.querySelector('.slider-next');
        let currentSlide = 0;
        let autoplayTimer;

        function showSlide(index) {
            currentSlide = (index + slides.length) % slides.length;
            slides.forEach((slide, i) => slide.classList.toggle('active', i === currentSlide));
            dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
        }

        function nextSlide() {
            showSlide(currentSlide + 1);
        }

        function prevSlide() {
            showSlide(currentSlide - 1);
        }

        function startAutoplay() {
            autoplayTimer = setInterval(nextSlide, 6000);
        }

        function resetAutoplay() {
            clearInterval(autoplayTimer);
            startAutoplay();
        }

        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoplay();
        });

        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoplay();
        });

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                showSlide(index);
                resetAutoplay();
            });
        });

        startAutoplay();
    }
});
