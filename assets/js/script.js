function googleMapsUrl(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function renderLocationsMenu() {
    const menu = document.getElementById('locations-menu');
    if (!menu || !window.EVTECH_LOCATIONS) {
        return;
    }

    const sorted = [...window.EVTECH_LOCATIONS].sort((a, b) => a.city.localeCompare(b.city));
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    menu.innerHTML = sorted.map((city) => {
        const isActive = currentPath === city.page;
        return `<li><a href="${city.page}"${isActive ? ' class="active"' : ''}>${city.city}</a></li>`;
    }).join('');
}

function renderServicesMenu() {
    const menu = document.getElementById('services-menu');
    if (!menu || !window.EVTECH_SERVICES) {
        return;
    }

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const hash = window.location.hash;

    menu.innerHTML = window.EVTECH_SERVICES.map((service) => {
        const href = `services.html#${service.id}`;
        const isActive = currentPath === 'services.html' && hash === `#${service.id}`;
        return `<li><a href="${href}"${isActive ? ' class="active"' : ''}>${service.name}</a></li>`;
    }).join('');
}

function renderCityBranches() {
    const container = document.getElementById('city-branches-list');
    if (!container || !window.EVTECH_LOCATIONS) {
        return;
    }

    const currentPath = window.location.pathname.split('/').pop() || '';
    const city = window.EVTECH_LOCATIONS.find((entry) => entry.page === currentPath);
    if (!city) {
        return;
    }

    const sectionTitle = document.getElementById('city-branches-title');
    if (sectionTitle) {
        sectionTitle.textContent = city.branches.length > 1
            ? `Find Our ${city.city} Locations`
            : `Find Our ${city.city} Location`;
    }

    container.innerHTML = city.branches.map((branch, index) => {
        const reverseClass = index % 2 === 1 ? ' location-branch-row--reverse' : '';
        const mapQuery = encodeURIComponent(branch.address);
        const mapSrc = `https://www.google.com/maps?q=${mapQuery}&z=15&hl=en&output=embed`;

        return `
        <article class="location-branch-row${reverseClass}" id="${branch.id}">
            <div class="location-branch-row__grid">
                <div class="location-branch-details service-card">
                    <h3>${branch.name}</h3>
                    <ul class="location-branch-meta">
                        <li>
                            <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                            <div>
                                <strong>Address</strong>
                                <a href="${googleMapsUrl(branch.address)}" target="_blank" rel="noopener noreferrer">${branch.address}</a>
                            </div>
                        </li>
                        <li>
                            <i class="fas fa-phone-alt" aria-hidden="true"></i>
                            <div>
                                <strong>Phone</strong>
                                <span>0800 900 911</span>
                            </div>
                        </li>
                        <li>
                            <i class="fas fa-envelope" aria-hidden="true"></i>
                            <div>
                                <strong>Email</strong>
                                <span>Info@evtech.co.nz</span>
                            </div>
                        </li>
                    </ul>
                </div>
                <div class="location-branch-map map-embed-dark">
                    <a
                        class="location-branch-map-open"
                        href="${googleMapsUrl(branch.address)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open ${branch.name} in Google Maps"
                    >
                        <span class="location-branch-map-open-label">
                            Open in Maps <i class="fas fa-external-link-alt" aria-hidden="true"></i>
                        </span>
                        <iframe
                            class="map-embed"
                            title="Map preview for ${branch.name}"
                            src="${mapSrc}"
                            width="100%"
                            height="100%"
                            style="border:0;"
                            loading="lazy"
                            referrerpolicy="no-referrer-when-downgrade"
                            tabindex="-1">
                        </iframe>
                    </a>
                </div>
            </div>
        </article>
        `;
    }).join('');
}

function renderLocationBranchCard(branch) {
    return `
            <article class="all-locations-branch">
                <h4>${branch.name}</h4>
                <ul class="all-locations-meta">
                    <li>
                        <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                        <a href="${googleMapsUrl(branch.address)}" target="_blank" rel="noopener noreferrer">${branch.address}</a>
                    </li>
                    <li>
                        <i class="fas fa-phone-alt" aria-hidden="true"></i>
                        <a href="tel:0800900911">0800 900 911</a>
                    </li>
                </ul>
            </article>`;
}

function initCheckListAnimation() {
    const lists = document.querySelectorAll('.check-list--animate');
    if (!lists.length) {
        return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tickDurationMs = 350;
    const textDurationMs = 500;

    lists.forEach((list) => {
        const items = [...list.querySelectorAll('li')];

        if (prefersReducedMotion) {
            items.forEach((li) => {
                li.classList.add('tick-in', 'is-revealed');
            });
            return;
        }

        const revealList = () => {
            let delay = 0;

            items.forEach((li) => {
                window.setTimeout(() => {
                    li.classList.add('tick-in');
                }, delay);

                delay += tickDurationMs;

                window.setTimeout(() => {
                    li.classList.add('is-revealed');
                }, delay);

                delay += textDurationMs;
            });
        };

        const listObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }
                    revealList();
                    listObserver.unobserve(entry.target);
                });
            },
            { threshold: 0.25, rootMargin: '0px 0px -10% 0px' }
        );

        listObserver.observe(list);
    });
}

function renderAllLocationsDirectory() {
    const container = document.getElementById('all-locations-list');
    if (!container || !window.EVTECH_LOCATIONS) {
        return;
    }

    const sorted = [...window.EVTECH_LOCATIONS].sort((a, b) => a.city.localeCompare(b.city));

    container.innerHTML = sorted.map((city) => {
        const isAuckland = city.city === 'Auckland';
        const branchGridClass = city.branches.length > 1 ? ' all-locations-branches--cols-3' : '';

        return `
            <div class="all-locations-city${isAuckland ? ' all-locations-city--wide' : ''}">
                <h3 class="all-locations-city-heading">${city.city}</h3>
                <div class="all-locations-branches${branchGridClass}">
                    ${city.branches.map(renderLocationBranchCard).join('')}
                </div>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderLocationsMenu();
    renderServicesMenu();
    renderCityBranches();
    renderAllLocationsDirectory();

    if (window.location.hash) {
        const target = document.querySelector(window.location.hash);
        if (target) {
            setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        }
    }

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
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function onAnchorClick(e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') {
                return;
            }
            const target = document.querySelector(href);
            if (!target) {
                return;
            }
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    document.querySelectorAll('.service-card, .advantage-card, .about-content').forEach(el => {
        observer.observe(el);
    });

    initCheckListAnimation();

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
