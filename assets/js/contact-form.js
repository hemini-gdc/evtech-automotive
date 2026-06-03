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

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearStatus();

        const gotcha = form.querySelector('[name="_gotcha"]');
        if (gotcha && gotcha.value) {
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
