/**
 * Contact page — send enquiries to the client inbox (see contact-config.js).
 */
function suburbFromAddress(address) {
    const parts = address.split(',').map((part) => part.trim());
    if (parts.length >= 3) {
        return parts[1];
    }
    if (parts.length >= 2) {
        return parts[0];
    }
    return '';
}

function populateContactLocationSelect() {
    const select = document.getElementById('location');
    if (!select || !window.EVTECH_LOCATIONS) {
        return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select preferred workshop';
    placeholder.disabled = true;
    placeholder.selected = true;

    const sorted = [...window.EVTECH_LOCATIONS].sort((a, b) => a.city.localeCompare(b.city));
    const fragment = document.createDocumentFragment();
    fragment.appendChild(placeholder);

    sorted.forEach((city) => {
        const group = document.createElement('optgroup');
        group.label = city.city;

        city.branches.forEach((branch) => {
            const suburb = suburbFromAddress(branch.address);
            const label = suburb ? `${branch.name} — ${suburb}` : branch.name;
            const option = document.createElement('option');
            option.value = `${city.city}: ${label}`;
            option.textContent = label;
            group.appendChild(option);
        });

        fragment.appendChild(group);
    });

    select.replaceChildren(fragment);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function phoneDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function validateContactField(name, rawValue) {
    const value = String(rawValue ?? '').trim();

    switch (name) {
        case 'name':
            if (!value) {
                return 'Please enter your full name.';
            }
            if (value.length < 2) {
                return 'Name must be at least 2 characters.';
            }
            if (value.length > 100) {
                return 'Name must be 100 characters or fewer.';
            }
            if (!/[\p{L}]/u.test(value)) {
                return 'Please enter a valid name.';
            }
            return '';

        case 'email':
            if (!value) {
                return 'Please enter your email address.';
            }
            if (!EMAIL_PATTERN.test(value)) {
                return 'Please enter a valid email address.';
            }
            return '';

        case 'phone': {
            if (!value) {
                return 'Please enter your phone number.';
            }
            const digits = phoneDigits(value);
            if (digits.length < 8 || digits.length > 15) {
                return 'Please enter a valid phone number (at least 8 digits).';
            }
            return '';
        }

        case 'vehicle':
            if (!value) {
                return 'Please enter your vehicle make and model.';
            }
            if (value.length < 3) {
                return 'Vehicle details must be at least 3 characters.';
            }
            return '';

        case 'location':
            if (!value) {
                return 'Please select a preferred workshop.';
            }
            return '';

        case 'service':
            if (!value) {
                return 'Please select a requested service.';
            }
            return '';

        case 'message':
            if (!value) {
                return 'Please enter your message.';
            }
            if (value.length < 10) {
                return 'Message must be at least 10 characters.';
            }
            if (value.length > 2000) {
                return 'Message must be 2000 characters or fewer.';
            }
            return '';

        default:
            return '';
    }
}

(function initContactForm() {
    populateContactLocationSelect();

    const form = document.getElementById('contact-form');
    if (!form) {
        return;
    }

    const config = window.EVTECH_CONTACT || {};
    const recipient = (config.recipientEmail || 'Info@evtech.co.nz').trim();
    const statusEl = document.getElementById('contact-form-status');
    const submitBtn = form.querySelector('.contact-submit-btn');
    const defaultBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    const fields = Array.from(form.querySelectorAll('input, select, textarea')).filter(
        (field) => field.name && field.name !== '_gotcha'
    );

    function setStatus(type, message) {
        if (!statusEl) {
            return;
        }
        statusEl.hidden = false;
        statusEl.className = `contact-form-status contact-form-status--${type}`;
        statusEl.textContent = message;
    }

    function clearStatus() {
        if (!statusEl) {
            return;
        }
        statusEl.hidden = true;
        statusEl.textContent = '';
        statusEl.className = 'contact-form-status';
    }

    function setLoading(loading) {
        if (!submitBtn) {
            return;
        }
        submitBtn.disabled = loading;
        submitBtn.setAttribute('aria-busy', loading ? 'true' : 'false');
        if (loading) {
            submitBtn.innerHTML = 'Sending… <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>';
        } else {
            submitBtn.innerHTML = defaultBtnHtml;
        }
    }

    function getFormGroup(field) {
        return field.closest('.form-group');
    }

    function setFieldError(field, message) {
        const group = getFormGroup(field);
        if (!group) {
            return;
        }

        group.classList.toggle('form-group--invalid', Boolean(message));
        field.setAttribute('aria-invalid', message ? 'true' : 'false');

        let errorEl = group.querySelector('.form-field-error');
        if (message) {
            if (!errorEl) {
                errorEl = document.createElement('p');
                errorEl.className = 'form-field-error';
                errorEl.id = `${field.id}-error`;
                group.appendChild(errorEl);
            }
            errorEl.textContent = message;
            field.setAttribute('aria-describedby', errorEl.id);
        } else if (errorEl) {
            errorEl.remove();
            field.removeAttribute('aria-describedby');
        }
    }

    function clearAllFieldErrors() {
        fields.forEach((field) => setFieldError(field, ''));
    }

    function validateField(field, { showError = true } = {}) {
        const message = validateContactField(field.name, field.value);
        if (showError) {
            setFieldError(field, message);
        }
        return !message;
    }

    function validateForm({ showErrors = true } = {}) {
        let firstInvalid = null;
        let valid = true;

        fields.forEach((field) => {
            const fieldValid = validateField(field, { showError: showErrors });
            if (!fieldValid) {
                valid = false;
                if (!firstInvalid) {
                    firstInvalid = field;
                }
            }
        });

        return { valid, firstInvalid };
    }

    fields.forEach((field) => {
        field.addEventListener('input', () => {
            if (getFormGroup(field)?.classList.contains('form-group--invalid')) {
                validateField(field);
            }
        });

        field.addEventListener('blur', () => {
            validateField(field);
        });

        field.addEventListener('change', () => {
            validateField(field);
        });
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearStatus();

        const gotcha = form.querySelector('[name="_gotcha"]');
        if (gotcha && gotcha.value) {
            return;
        }

        const { valid, firstInvalid } = validateForm({ showErrors: true });
        if (!valid) {
            setStatus('error', 'Please fix the highlighted fields before sending.');
            if (firstInvalid) {
                firstInvalid.focus({ preventScroll: true });
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        const formData = new FormData(form);
        const name = String(formData.get('name') || '').trim();
        const email = String(formData.get('email') || '').trim();

        const payload = {
            name,
            email,
            phone: formData.get('phone'),
            vehicle: formData.get('vehicle'),
            location: formData.get('location'),
            service: formData.get('service'),
            message: formData.get('message'),
            _subject: `EVtech website enquiry — ${name}`,
            _replyto: email,
            _template: 'table',
            _captcha: 'false',
        };

        setLoading(true);

        try {
            const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.message || 'Unable to send your message. Please try again.');
            }

            form.reset();
            populateContactLocationSelect();
            clearAllFieldErrors();
            setStatus(
                'success',
                'Thank you — your message was sent. We will get back to you shortly.'
            );
        } catch (err) {
            setStatus(
                'error',
                err.message || 'Something went wrong. Please call 0800 900 911 or email Info@evtech.co.nz.'
            );
        } finally {
            setLoading(false);
        }
    });
})();
