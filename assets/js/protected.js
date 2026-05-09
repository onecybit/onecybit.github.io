const OCB_GATE = {

    init() {
        const gate = document.querySelector('[data-gate]');
        if (!gate) return;

        this.gate    = gate;
        this.form    = gate.querySelector('[data-gate-form]');
        this.input   = gate.querySelector('#gate-password');
        this.msg     = gate.querySelector('[data-gate-msg]');
        this.payload = gate.querySelector('[data-gate-payload]');
        this.body    = document.querySelector('.post-body');
        this.blob    = null;

        if (!this.form || !this.input || !this.payload || !this.body) return;
        if (!window.crypto || !window.crypto.subtle) {
            this.setMessage('Web Crypto unavailable in this browser', 'error');
            this.form.querySelector('button').disabled = true;
            return;
        }

        try {
            this.blob = JSON.parse(this.payload.textContent);
        } catch (err) {
            this.setMessage('payload corrupt — cannot decrypt', 'error');
            this.form.querySelector('button').disabled = true;
            return;
        }

        this.form.addEventListener('submit', this.onSubmit.bind(this));
    },

    setMessage(text, kind) {
        this.msg.textContent = text;
        this.msg.classList.remove('gate-msg--error', 'gate-msg--ok', 'gate-msg--working');
        if (kind === 'error')   this.msg.classList.add('gate-msg--error');
        if (kind === 'ok')      this.msg.classList.add('gate-msg--ok');
        if (kind === 'working') this.msg.classList.add('gate-msg--working');
    },

    b64decode(s) {
        const bin = atob(s);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    },

    async deriveKey(password, salt, iters) {
        const baseKey = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );
        const bits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt, iterations: iters, hash: 'SHA-256' },
            baseKey,
            256
        );
        return new Uint8Array(bits);
    },

    async streamXor(key, nonce, data) {
        const out      = new Uint8Array(data.length);
        const block    = new Uint8Array(key.length + nonce.length + 8);
        block.set(key, 0);
        block.set(nonce, key.length);
        const ctrView  = new DataView(block.buffer, key.length + nonce.length, 8);
        let counter    = 0n;
        let offset     = 0;

        while (offset < data.length) {
            ctrView.setBigUint64(0, counter, false);
            const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', block));
            const end  = Math.min(offset + 32, data.length);
            for (let i = 0; i < end - offset; i++) {
                out[offset + i] = data[offset + i] ^ hash[i];
            }
            offset = end;
            counter++;
        }
        return out;
    },

    async verifyMac(key, nonce, ciphertext, expectedMac) {
        const hmacKey = await crypto.subtle.importKey(
            'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
        );
        const data = new Uint8Array(nonce.length + ciphertext.length);
        data.set(nonce, 0);
        data.set(ciphertext, nonce.length);
        return crypto.subtle.verify('HMAC', hmacKey, expectedMac, data);
    },

    async decrypt(password) {
        const blob  = this.blob;
        const salt  = this.b64decode(blob.salt);
        const nonce = this.b64decode(blob.nonce);
        const ct    = this.b64decode(blob.ciphertext);
        const mac   = this.b64decode(blob.mac);
        const key   = await this.deriveKey(password, salt, blob.kdf_iters);
        const ok    = await this.verifyMac(key, nonce, ct, mac);
        if (!ok) throw new Error('bad-password');
        const pt = await this.streamXor(key, nonce, ct);
        return new TextDecoder().decode(pt);
    },

    renderInto(htmlText, target) {
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        target.replaceChildren();
        while (doc.body.firstChild) {
            target.appendChild(doc.body.firstChild);
        }
    },

    async onSubmit(e) {
        e.preventDefault();
        const pw = this.input.value;
        if (!pw) return;

        const submitBtn = this.form.querySelector('button');
        submitBtn.disabled = true;
        this.setMessage('decrypting…', 'working');

        try {
            const html = await this.decrypt(pw);
            this.renderInto(html, this.body);
            this.input.value = '';
            if (typeof OCB !== 'undefined' && typeof OCB.initCopyButtons === 'function') {
                OCB.initCopyButtons();
            }
        } catch (err) {
            this.setMessage(
                err.message === 'bad-password'
                    ? 'wrong password — access denied'
                    : 'decryption failed: ' + err.message,
                'error'
            );
            submitBtn.disabled = false;
        }
    },

};

document.addEventListener('DOMContentLoaded', function() { OCB_GATE.init(); });
