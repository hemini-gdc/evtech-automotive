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
                <div class="location-branch-map">
                    <iframe
                        title="Map for ${branch.name}"
                        src="${mapSrc}"
                        width="100%"
                        height="100%"
                        style="border:0;"
                        allowfullscreen=""
                        loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade">
                    </iframe>
                </div>
            </div>
        </article>
        `;
    }).join('');
}

function renderAllLocationsDirectory() {
    const container = document.getElementById('all-locations-list');
    if (!container || !window.EVTECH_LOCATIONS) {
        return;
    }

    const sorted = [...window.EVTECH_LOCATIONS].sort((a, b) => a.city.localeCompare(b.city));

    container.innerHTML = sorted.map((city) => {
        const branchesHtml = city.branches.map((branch) => `
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
            </article>
        `).join('');

        return `
            <div class="all-locations-city">
                <h3>${city.city}</h3>
                <div class="all-locations-branches">${branchesHtml}</div>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderLocationsMenu();
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

    document.querySelectorAll('.service-card, .advantage-card, .about-content').forEach(el => {
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
