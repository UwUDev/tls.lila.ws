function truncateString(str, maxLength = 50) {
    if (typeof str === 'string' && str.length > maxLength) {
        return str.substring(0, maxLength) + '...';
    }
    return str;
}

function formatValue(value) {
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value, null, 2);
    }
    return truncateString(String(value));
}

function copyToClipboard(text, buttonId, event) {
    if (event) {
        event.stopPropagation();
    }

    navigator.clipboard.writeText(text).then(() => {
        const button = document.getElementById(buttonId);
        if (button) {
            const originalText = button.textContent;
            button.textContent = '✓ Copied!';
            button.classList.add('success');

            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('success');
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy: ', err);
        // Fallback for older browsers
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            const button = document.getElementById(buttonId);
            if (button) {
                const originalText = button.textContent;
                button.textContent = '✓ Copied!';
                button.classList.add('success');
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('success');
                }, 2000);
            }
        } catch (fallbackErr) {
            alert('Failed to copy to clipboard. Please copy manually.');
        }
    });
}

function generateCopyId() {
    return 'copy_' + Math.random().toString(36).substr(2, 9);
}

function createInfoItem(label, value, copyData = null) {
    const copyId = generateCopyId();
    const dataToUse = copyData || value;
    const copyButton = copyData !== null || (typeof value === 'string' && value.length > 10) ?
        `<button class="copy-btn" id="${copyId}" onclick="copyToClipboard('${escapeQuotes(dataToUse)}', '${copyId}', event)">📋 Copy</button>` : '';

    return `
                <div class="info-item">
                    <div>
                        <div class="info-label">${label}</div>
                        <div class="info-value">${formatValue(value)}</div>
                    </div>
                    ${copyButton}
                </div>
            `;
}

function createCollapsibleSection(id, title, content, copyData = null) {
    const copyButton = copyData ? createCopyButton(JSON.stringify(copyData, null, 2), '📋 Copy All') : {html: ''};

    return `
            <div class="list-container">
                <div class="collapsible-header">
                    <div class="section-title" onclick="toggleCollapsible('${id}')" style="flex: 1; cursor: pointer;">${title}</div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${copyButton.html}
                        <span class="collapsible-toggle" id="${id}-toggle" onclick="toggleCollapsible('${id}')" style="cursor: pointer;">▼</span>
                    </div>
                </div>
                <div class="collapsible-content" id="${id}">
                    ${content}
                </div>
            </div>
        `;
}

function escapeQuotes(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

function createCopyButton(text, label = 'Copy') {
    const copyId = generateCopyId();
    return {
        id: copyId,
        html: `<button class="copy-btn" id="${copyId}" onclick="handleCopy('${copyId}', this)" data-copy-text="${btoa(unescape(encodeURIComponent(text)))}">${label}</button>`
    };
}

function handleCopy(buttonId, buttonElement) {
    event.stopPropagation();
    try {
        const encodedText = buttonElement.getAttribute('data-copy-text');
        const text = decodeURIComponent(escape(atob(encodedText)));

        navigator.clipboard.writeText(text).then(() => {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '✓ Copied!';
            buttonElement.classList.add('success');

            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.classList.remove('success');
            }, 2000);
        }).catch(() => {
            // Fallback method
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            const originalText = buttonElement.textContent;
            buttonElement.textContent = '✓ Copied!';
            buttonElement.classList.add('success');
            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.classList.remove('success');
            }, 2000);
        });
    } catch (error) {
        console.error('Copy failed:', error);
        alert('Failed to copy. Please try again.');
    }
}

function renderBasicInfo(data) {
    const basicInfoData = {
        http_version: data.http_version,
        method: data.method,
        user_agent: data.user_agent
    };

    if (data.http2 && data.http2.sent_frames) {
        const pseudoHeaders = extractPseudoHeadersFromFrames(data.http2.sent_frames);
        if (pseudoHeaders) {
            Object.assign(basicInfoData, pseudoHeaders);
        }
    }

    const copyButton = createCopyButton(JSON.stringify(basicInfoData, null, 2), '📋 Copy Section');

    let supportedHttpVersionsField = '';
    if (data.tls && data.tls.extensions && data.tls.extensions.length > 0) {
        const alpnExt = data.tls.extensions.find(ext =>
            Object.keys(ext)[0] === 'application_layer_protocol_negotiation' &&
            ext.application_layer_protocol_negotiation &&
            ext.application_layer_protocol_negotiation.data &&
            Array.isArray(ext.application_layer_protocol_negotiation.data)
        );

        if (alpnExt) {
            const supportedProtocols = alpnExt.application_layer_protocol_negotiation.data
                .map(protocol => {
                    if (protocol === 'h3') return '3.0';
                    if (protocol === 'h2') return '2.0';
                    if (protocol === 'http/1.1') return '1.1';
                    if (protocol === 'http/1.0') return '1.0';
                    if (protocol === 'http/0.9') return '0.9';
                    return protocol;
                })
                .join(', ');
            supportedHttpVersionsField = createInfoItem('Supported HTTP Versions', supportedProtocols, supportedProtocols);
        }
    }

    let gridContent = `
        ${createInfoItem('HTTP Version', data.http_version.replace("HTTP/", ''), data.http_version)}
        ${createInfoItem('Method', data.method, data.method)}
        ${createInfoItem('User Agent', data.user_agent, data.user_agent)}
        ${supportedHttpVersionsField}
    `;

    if (data.http2 && data.http2.sent_frames) {
        const pseudoHeaders = extractPseudoHeadersFromFrames(data.http2.sent_frames);
        if (pseudoHeaders) {
            if (pseudoHeaders[':method']) {
                gridContent += createInfoItem('HTTP/2 Method', pseudoHeaders[':method'], pseudoHeaders[':method']);
            }
            if (pseudoHeaders[':authority']) {
                gridContent += createInfoItem('Authority', pseudoHeaders[':authority'], pseudoHeaders[':authority']);
            }
            if (pseudoHeaders[':scheme']) {
                gridContent += createInfoItem('Scheme', pseudoHeaders[':scheme'], pseudoHeaders[':scheme']);
            }
            if (pseudoHeaders[':path']) {
                gridContent += createInfoItem('Path', pseudoHeaders[':path'], pseudoHeaders[':path']);
            }
        }
    }

    const content = `<div class="info-grid">${gridContent}</div>`;

    return createMainSection('basic-info', '📊 Basic Information', content, copyButton.html);
}

function renderTLSInfo(tls) {
    if (!tls) return '';

    const copyButton = createCopyButton(JSON.stringify(tls, null, 2), '📋 Copy Section');

    let supportedVersionsField = '';
    let greaseSupported = '';
    if (tls.extensions && tls.extensions.length > 0) {
        const supportedVersionsExt = tls.extensions.find(ext =>
            Object.keys(ext)[0] === 'supported_versions' &&
            ext.supported_versions &&
            ext.supported_versions.data &&
            Array.isArray(ext.supported_versions.data)
        );

        if (supportedVersionsExt) {
            const allVersions = supportedVersionsExt.supported_versions.data;
            const nonGreaseVersions = allVersions.filter(version => !version.includes('GREASE'));
            const hasGrease = allVersions.some(version => version.includes('GREASE'));

            const supportedVersions = nonGreaseVersions
                .join(', ')
                .replace(/TLSv/g, '')
                .replace(/_/g, '.');
            supportedVersionsField = createInfoItem('Supported TLS Versions', supportedVersions, supportedVersions);

            // Add GREASE support field
            greaseSupported = createInfoItem('GREASE Supported', hasGrease ? 'Yes' : 'No', hasGrease ? 'Yes' : 'No');
        }
    }

    let content = `
        <div class="info-grid">
            ${createInfoItem('TLS Version', tls.tls_version.replace("TLSv", '').replace("_", '.'), tls.tls_version)}
            ${createInfoItem('Client Random', tls.client_random, tls.client_random)}
            ${createInfoItem('Session ID', tls.session_id, tls.session_id)}
            ${supportedVersionsField}
            ${greaseSupported}
        </div>
    `;

    if (tls.ciphers && tls.ciphers.length > 0) {
        const ciphersContent = tls.ciphers.map((cipher) => {
            const copyId = generateCopyId();
            return `<div class="list-item" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${cipher}</span>
                    <button class="copy-btn" id="${copyId}" onclick="copyToClipboard('${escapeQuotes(cipher)}', '${copyId}', event)">📋</button>
                </div>`;
        }).join('');
        content += createCollapsibleSection('ciphers', '🔑 Supported Ciphers', ciphersContent, tls.ciphers);
    }

    if (tls.extensions && tls.extensions.length > 0) {
        const extensionsContent = tls.extensions.map((ext) => {
            const extName = Object.keys(ext)[0];
            const extData = ext[extName];
            const copyButton = createCopyButton(JSON.stringify(ext, null, 2), '📋');

            // Check if extData has only a 'value' field or if it's a simple value
            let displayContent;
            if (typeof extData === 'object' && extData !== null) {
                // Special handling for supported_versions extension
                if (extName === 'supported_versions' && extData.hasOwnProperty('data') && Array.isArray(extData.data)) {
                    const supportedVersions = extData.data.filter(version => !version.includes('GREASE'));
                    displayContent = `Supported TLS Versions: ${supportedVersions.join(', ')}`;
                    if (Object.keys(extData).length > 1) {
                        displayContent += `\n\nFull data:\n${JSON.stringify(extData, null, 2)}`;
                    }
                } else if (Object.keys(extData).length === 1 && extData.hasOwnProperty('value')) {
                    displayContent = formatValue(extData.value);
                } else if (extData.hasOwnProperty('value')) {
                    displayContent = `Value: ${formatValue(extData.value)}`;
                    if (Object.keys(extData).length > 1) {
                        displayContent += `\n\nData:\n${JSON.stringify(extData, null, 2)}`;
                    }
                } else {
                    displayContent = formatValue(extData);
                }
            } else {
                displayContent = formatValue(extData);
            }

            const formattedDisplayContent = displayContent.replace(/\n/g, '<br>');

            return `
                <div class="extension-item">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1; min-width: 0;">
                            <div class="extension-name">${extName}</div>
                            <div class="extension-details" style="white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word;">${formattedDisplayContent}</div>
                        </div>
                        ${copyButton.html}
                    </div>
                </div>
            `;
        }).join('');
        content += createCollapsibleSection('extensions', '🧩 TLS Extensions', extensionsContent, tls.extensions);
    }

    return createMainSection('tls-info', '🔐 TLS Information', content, copyButton.html);
}

function renderHeadersSection(http2) {
    if (!http2 || !http2.sent_frames) return '';

    const headers = extractHeadersFromFrames(http2.sent_frames);
    if (!headers) return '';

    // filter out pseudo-headers (those starting with ":")
    const actualHeaders = headers.filter(header => !header.startsWith(':'));

    if (actualHeaders.length === 0) return '';

    const headersData = actualHeaders.reduce((acc, header) => {
        const colonIndex = header.indexOf(':');
        if (colonIndex !== -1) {
            const name = header.substring(0, colonIndex);
            const value = header.substring(colonIndex + 1).trim();
            acc[name] = value;
        }
        return acc;
    }, {});

    const copyButton = createCopyButton(JSON.stringify(headersData, null, 2), '📋 Copy Section');

    const headersContent = actualHeaders.map(header => {
        const colonIndex = header.indexOf(':');
        const headerCopyButton = createCopyButton(header, '📋');

        if (colonIndex === -1) {
            return `<div class="header-item" style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="header-value">${header}</span>
                    ${headerCopyButton.html}
                </div>`;
        }

        const name = header.substring(0, colonIndex);
        const value = header.substring(colonIndex + 1).trim();

        return `<div class="header-item" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <span class="header-name">${name}:</span>
                    <span class="header-value">${value}</span>
                </div>
                ${headerCopyButton.html}
            </div>`;
    }).join('');

    const content = `<div class="list-container">${headersContent}</div>`;

    return createMainSection('headers-info', '📋 HTTP Headers', content, copyButton.html);
}

function renderHTTP2Info(http2) {
    if (!http2) return '';

    const copyButton = createCopyButton(JSON.stringify(http2, null, 2), '📋 Copy Section');

    let gridContent = `
        ${createInfoItem('Akamai Fingerprint', http2.akamai_fingerprint, http2.akamai_fingerprint)}
        ${createInfoItem('Fingerprint Hash', http2.akamai_fingerprint_hash, http2.akamai_fingerprint_hash)}
    `;

    if (http2.sent_frames && http2.sent_frames.length > 0) {
        gridContent += createInfoItem('HTTP/2 Frames Count', http2.sent_frames.length.toString(), http2.sent_frames.length.toString());
    }

    let content = `<div class="info-grid">${gridContent}</div>`;

    if (http2.sent_frames && http2.sent_frames.length > 0) {
        const framesContent = http2.sent_frames.map((frame) => {
            const frameButton = createCopyButton(JSON.stringify(frame, null, 2), '📋');

            let frameDetails;
            if (frame.frame_type === "WindowUpdate") {
                frameDetails = `increment: ${frame.increment}`;
            } else {
                frameDetails = JSON.stringify(frame, null, 2);
            }

            let frame_html = `
                <div class="frame-item">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div class="frame-type">${frame.frame_type}</div>
                            <div class="frame-size">Size: ${frame.length} bytes</div>
                            <div class="extension-details" style="white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word;">${frameDetails}</div>
                        </div>
                        ${frameButton.html}
                    </div>
                </div>
            `;
            return frame_html;
        }).join('');
        content += createCollapsibleSection('frames', '📦 Sent Frames', framesContent, http2.sent_frames);
    }

    return createMainSection('http2-info', '🚀 HTTP/2 Information', content, copyButton.html);
}

function createMainSection(id, title, content, copyButtonHtml) {
    return `
        <div class="section">
            <div class="section-header collapsible-header" onclick="toggleCollapsible('${id}')" style="cursor: pointer;">
                <div class="section-title">${title}</div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${copyButtonHtml}
                    <span class="collapsible-toggle open" id="${id}-toggle">▼</span>
                </div>
            </div>
            <div class="collapsible-content open" id="${id}">
                ${content}
            </div>
        </div>
    `;
}

function extractHeadersFromFrames(frames) {
    if (!frames || !Array.isArray(frames)) return null;

    const headersFrame = frames.find(frame => frame.frame_type === "Headers" && frame.headers);

    if (!headersFrame || !headersFrame.headers) return null;

    return headersFrame.headers;
}

function extractPseudoHeadersFromFrames(frames) {
    if (!frames || !Array.isArray(frames)) return null;

    const headersFrame = frames.find(frame => frame.frame_type === "Headers" && frame.headers);

    if (!headersFrame || !headersFrame.headers) return null;

    // Extract only pseudo-headers (those starting with ":")
    const pseudoHeaders = {};
    headersFrame.headers.forEach(header => {
        if (header.startsWith(':')) {
            const colonIndex = header.indexOf(':', 1);
            if (colonIndex !== -1) {
                const name = header.substring(0, colonIndex);
                const value = header.substring(colonIndex + 1).trim();
                pseudoHeaders[name] = value;
            }
        }
    });

    return Object.keys(pseudoHeaders).length > 0 ? pseudoHeaders : null;
}

function toggleCollapsible(id) {
    const content = document.getElementById(id);
    const toggle = document.getElementById(id + '-toggle');

    if (content.classList.contains('open')) {
        content.classList.remove('open');
        toggle.classList.remove('open');
    } else {
        content.classList.add('open');
        toggle.classList.add('open');
    }
}

async function fetchDebugInfo() {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Fetching debug information...</p>
                </div>
            `;

    try {
        const response = await fetch('https://rp.lila.ws:8749/api/all');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        const copyAllButton = createCopyButton(JSON.stringify(data, null, 2), '📋 Copy Everything');

        const copyAllContainer = document.createElement('div');
        copyAllContainer.style.textAlign = 'center';
        copyAllContainer.style.marginBottom = '20px';
        copyAllContainer.innerHTML = copyAllButton.html;

        let html = '';

        html += renderBasicInfo(data);
        html += renderTLSInfo(data.tls);
        html += renderHeadersSection(data.http2);
        html += renderHTTP2Info(data.http2);

        contentDiv.innerHTML = copyAllContainer.outerHTML + html;

    } catch (error) {
        contentDiv.innerHTML = `
                    <div class="error">
                        <h3>❌ Error Loading Debug Information</h3>
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p>Please check your network connection and try again.</p>
                    </div>
                `;
    }
}

async function importFromClipboard() {
    const contentDiv = document.getElementById('content');

    try {
        contentDiv.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Reading from clipboard...</p>
            </div>
        `;

        const clipboardText = await navigator.clipboard.readText();

        if (!clipboardText.trim()) {
            throw new Error('Clipboard is empty');
        }

        let data;
        try {
            data = JSON.parse(clipboardText);
        } catch (parseError) {
            throw new Error('Invalid JSON format in clipboard');
        }

        contentDiv.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>✓ Successfully imported from clipboard</p>
            </div>
        `;

        setTimeout(() => {
            renderImportedData(data);
        }, 500);

    } catch (error) {
        contentDiv.innerHTML = `
            <div class="error">
                <h3>❌ Import Failed</h3>
                <p><strong>Error:</strong> ${error.message}</p>
                <p>Please ensure your clipboard contains valid JSON data from the analysis tool.</p>
            </div>
        `;
    }
}

function renderImportedData(data) {
    const contentDiv = document.getElementById('content');

    const copyAllButton = createCopyButton(JSON.stringify(data, null, 2), '📋 Copy Everything');

    const copyAllContainer = document.createElement('div');
    copyAllContainer.style.textAlign = 'center';
    copyAllContainer.style.marginBottom = '20px';
    copyAllContainer.innerHTML = copyAllButton.html;

    let html = '';

    if (data.http_version || data.method || data.user_agent) {
        html += renderBasicInfo(data);
    }

    if (data.tls) {
        html += renderTLSInfo(data.tls);
    }

    if (data.http2) {
        html += renderHeadersSection(data.http2);
        html += renderHTTP2Info(data.http2);
    }

    if (html === '') {
        contentDiv.innerHTML = `
            <div class="error">
                <h3>⚠️ No Recognized Data</h3>
                <p>The imported JSON doesn't contain recognized TLS or HTTP analysis data.</p>
                <p>Expected fields: http_version, method, user_agent, tls, http2</p>
            </div>
        `;
        return;
    }

    contentDiv.innerHTML = copyAllContainer.outerHTML + html;
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', fetchDebugInfo);
