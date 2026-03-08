(function () {
  var ORG_ID = '';
  var ORG_NAME = '';

  // Read from script tag data attributes
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.indexOf('embed-chat.js') !== -1) {
      ORG_ID = scripts[i].getAttribute('data-org-id') || '';
      ORG_NAME = scripts[i].getAttribute('data-org-name') || '';
      break;
    }
  }

  if (!ORG_ID) {
    console.error('[ChatWidget] Missing data-org-id on script tag');
    return;
  }

  var BASE = scripts[i].src.replace('/embed-chat.js', '');
  var isOpen = false;

  // Styles
  var style = document.createElement('style');
  style.textContent = [
    '#chief-chat-bubble{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#60a5fa);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 24px rgba(59,130,246,.4);display:flex;align-items:center;justify-content:center;z-index:999999;transition:transform .2s,box-shadow .2s}',
    '#chief-chat-bubble:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(59,130,246,.5)}',
    '#chief-chat-bubble svg{width:28px;height:28px}',
    '#chief-chat-frame-wrap{position:fixed;bottom:96px;right:24px;width:400px;height:600px;max-height:calc(100vh - 120px);max-width:calc(100vw - 48px);border-radius:16px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.25);z-index:999998;opacity:0;transform:translateY(16px) scale(.96);transition:opacity .25s,transform .25s;pointer-events:none}',
    '#chief-chat-frame-wrap.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',
    '#chief-chat-frame{width:100%;height:100%;border:none;border-radius:16px}',
    '@media(max-width:480px){#chief-chat-frame-wrap{bottom:0;right:0;width:100vw;height:100vh;max-height:100vh;max-width:100vw;border-radius:0}#chief-chat-frame{border-radius:0}#chief-chat-bubble.open{display:none}}'
  ].join('\n');
  document.head.appendChild(style);

  // Bubble
  var bubble = document.createElement('button');
  bubble.id = 'chief-chat-bubble';
  bubble.setAttribute('aria-label', 'Open chat');
  bubble.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>';

  // Frame wrapper
  var wrap = document.createElement('div');
  wrap.id = 'chief-chat-frame-wrap';

  var chatUrl = BASE + '/chat/' + encodeURIComponent(ORG_ID);
  if (ORG_NAME) chatUrl += '?name=' + encodeURIComponent(ORG_NAME);

  var iframe = document.createElement('iframe');
  iframe.id = 'chief-chat-frame';
  iframe.src = chatUrl;
  iframe.setAttribute('allow', 'microphone');
  wrap.appendChild(iframe);

  document.body.appendChild(wrap);
  document.body.appendChild(bubble);

  bubble.addEventListener('click', function () {
    isOpen = !isOpen;
    wrap.classList.toggle('open', isOpen);
    bubble.classList.toggle('open', isOpen);
    bubble.innerHTML = isOpen
      ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>';
    bubble.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat');
  });
})();
