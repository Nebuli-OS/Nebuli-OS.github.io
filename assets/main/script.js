const introOverlay = document.createElement('div');
introOverlay.id = 'introOverlay';
introOverlay.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: black;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const introIframe = document.createElement('iframe');
introIframe.src = '/intro.html';
introIframe.style.cssText = `
  width: 100%;
  height: 100%;
  border: none;
  margin: 0;
  padding: 0;
`;

introOverlay.appendChild(introIframe);
document.body.appendChild(introOverlay);

setTimeout(() => {
  introOverlay.style.transition = 'opacity 1s ease-out';
  introOverlay.style.opacity = '0';
  setTimeout(() => {
    introOverlay.style.display = 'none';
    introOverlay.remove();
  }, 1000);
}, 6000);

const settingsTemplate = document.getElementById('settingsTemplate');

const wrapper = document.getElementById('wrapper');
const tabs = document.getElementById('tabs');
const resizeHandle = document.getElementById('resize-handle');
const minimizeBubble = document.getElementById('minimizeBubble');
const startMenuContainer = document.getElementById('startMenuContainer');
const startMenuBtn = document.getElementById('startMenuBtn');

const popup = document.getElementById("nebuliRootPopup");
const closeBtn = document.getElementById("nebuliRootPopupClose");
const openBtn = document.getElementById("openNebuliRoot");
const frameContainer = document.getElementById("nebuliRootFrameContainer");

let wrapperDragState = {
  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  targetX: 0,
  targetY: 0,
  currentX: 0,
  currentY: 0,
  animationFrameId: null
};

let bubbleDragState = {
  dragging: false,
  bubbleOffsetX: 0,
  bubbleOffsetY: 0,
  targetX: 0,
  targetY: 0,
  currentX: 0,
  currentY: 0,
  animationFrameId: null
};

let tabDragOffsetX = 0;
let tabPlaceholder = null;
let tabDragging = false;

let appWindows = {};
let appWindowCounter = 0;
let maxZIndex = 105;

let startMenuOpen = false;

const WINDOW_WIDTH = 900;
const WINDOW_HEIGHT = 650;

const CUSTOM_PROTOCOL = 'nebuli://';
const PROXY_EMBED_URL = '/embed.html#';

const REDIRECTS = {
};

if (closeBtn) {
  closeBtn.onclick = () => {
    popup.style.display = "none";
  };
}

if (openBtn) {
  openBtn.onclick = () => {
    frameContainer.style.display = "block";
    popup.style.display = "none";
  };
}

function updateWrapperPosition() {
  const dx = wrapperDragState.targetX - wrapperDragState.currentX;
  const dy = wrapperDragState.targetY - wrapperDragState.currentY;
  
  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
    wrapperDragState.currentX += dx * 0.85;
    wrapperDragState.currentY += dy * 0.85;
    
    wrapper.style.left = wrapperDragState.currentX + 'px';
    wrapper.style.top = wrapperDragState.currentY + 'px';
    
    wrapperDragState.animationFrameId = requestAnimationFrame(updateWrapperPosition);
  } else {
    wrapperDragState.currentX = wrapperDragState.targetX;
    wrapperDragState.currentY = wrapperDragState.targetY;
    wrapper.style.left = wrapperDragState.targetX + 'px';
    wrapper.style.top = wrapperDragState.targetY + 'px';
    
    if (wrapperDragState.animationFrameId) {
      cancelAnimationFrame(wrapperDragState.animationFrameId);
      wrapperDragState.animationFrameId = null;
    }
  }
}

function updateBubblePosition() {
  const dx = bubbleDragState.targetX - bubbleDragState.currentX;
  const dy = bubbleDragState.targetY - bubbleDragState.currentY;
  
  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
    bubbleDragState.currentX += dx * 0.85;
    bubbleDragState.currentY += dy * 0.85;
    
    minimizeBubble.style.left = bubbleDragState.currentX + 'px';
    minimizeBubble.style.top = bubbleDragState.currentY + 'px';
    
    bubbleDragState.animationFrameId = requestAnimationFrame(updateBubblePosition);
  } else {
    bubbleDragState.currentX = bubbleDragState.targetX;
    bubbleDragState.currentY = bubbleDragState.targetY;
    minimizeBubble.style.left = bubbleDragState.targetX + 'px';
    minimizeBubble.style.top = bubbleDragState.targetY + 'px';
    
    if (bubbleDragState.animationFrameId) {
      cancelAnimationFrame(bubbleDragState.animationFrameId);
      bubbleDragState.animationFrameId = null;
    }
  }
}

function raiseWindowToTop(element) {
  maxZIndex++;
  element.style.zIndex = maxZIndex;
}

let appWindowDragStates = {};

function setupWindowDrag(windowElement, headerElement, windowId) {
  if (!appWindowDragStates[windowId]) {
    appWindowDragStates[windowId] = {
      dragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
      animationFrameId: null
    };
  }

  function updateWindowPosition() {
    const state = appWindowDragStates[windowId];
    if (!state) return;
    const dx = state.targetX - state.currentX;
    const dy = state.targetY - state.currentY;
    
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      state.currentX += dx * 0.85;
      state.currentY += dy * 0.85;
      
      windowElement.style.left = state.currentX + 'px';
      windowElement.style.top = state.currentY + 'px';
      
      state.animationFrameId = requestAnimationFrame(updateWindowPosition);
    } else {
      state.currentX = state.targetX;
      state.currentY = state.targetY;
      windowElement.style.left = state.targetX + 'px';
      windowElement.style.top = state.targetY + 'px';
      
      if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
      }
    }
  }

  headerElement.addEventListener('pointerdown', e => {
    const state = appWindowDragStates[windowId];
    if (!state) return;
    state.dragging = true;
    const rect = windowElement.getBoundingClientRect();
    state.dragOffsetX = e.clientX - rect.left;
    state.dragOffsetY = e.clientY - rect.top;
    
    state.currentX = rect.left;
    state.currentY = rect.top;
    state.targetX = rect.left;
    state.targetY = rect.top;
    
    headerElement.style.cursor = 'grabbing';
    raiseWindowToTop(windowElement);
    e.preventDefault();
  });

  document.addEventListener('pointermove', e => {
    const state = appWindowDragStates[windowId];
    if (!state || !state.dragging) return;
    
    let newLeft = e.clientX - state.dragOffsetX;
    let newTop = e.clientY - state.dragOffsetY;
    
    const maxLeft = window.innerWidth - windowElement.offsetWidth;
    const maxTop = window.innerHeight - windowElement.offsetHeight;
    
    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;
    if (newLeft > maxLeft) newLeft = maxLeft;
    if (newTop > maxTop) newTop = maxTop;
    
    state.targetX = newLeft;
    state.targetY = newTop;
    
    if (!state.animationFrameId) {
      state.animationFrameId = requestAnimationFrame(updateWindowPosition);
    }
  });

  document.addEventListener('pointerup', e => {
    const state = appWindowDragStates[windowId];
    if (state && state.dragging) {
      state.dragging = false;
      headerElement.style.cursor = 'grab';
    }
  });
}

let appWindowResizeStates = {};

function setupWindowResize(windowElement, windowId) {
  if (!appWindowResizeStates[windowId]) {
    appWindowResizeStates[windowId] = {
      resizing: false,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
      targetWidth: 0,
      targetHeight: 0,
      currentWidth: 0,
      currentHeight: 0,
      animationFrameId: null
    };
  }

  const resizeHandle = document.createElement('div');
  resizeHandle.style.cssText = `
    position: absolute;
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    cursor: nwse-resize;
    z-index: 200;
  `;

  windowElement.appendChild(resizeHandle);

  function updateWindowSize() {
    const state = appWindowResizeStates[windowId];
    if (!state) return;
    const dw = state.targetWidth - state.currentWidth;
    const dh = state.targetHeight - state.currentHeight;
    
    if (Math.abs(dw) > 0.5 || Math.abs(dh) > 0.5) {
      state.currentWidth += dw * 0.85;
      state.currentHeight += dh * 0.85;
      
      windowElement.style.width = state.currentWidth + 'px';
      windowElement.style.height = state.currentHeight + 'px';
      
      state.animationFrameId = requestAnimationFrame(updateWindowSize);
    } else {
      state.currentWidth = state.targetWidth;
      state.currentHeight = state.targetHeight;
      windowElement.style.width = state.targetWidth + 'px';
      windowElement.style.height = state.targetHeight + 'px';
      
      if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
      }
    }
  }

  resizeHandle.addEventListener('pointerdown', e => {
    const state = appWindowResizeStates[windowId];
    if (!state) return;
    state.resizing = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startWidth = windowElement.offsetWidth;
    state.startHeight = windowElement.offsetHeight;
    state.currentWidth = state.startWidth;
    state.currentHeight = state.startHeight;
    state.targetWidth = state.startWidth;
    state.targetHeight = state.startHeight;
    e.preventDefault();
    resizeHandle.setPointerCapture(e.pointerId);
  });

  resizeHandle.addEventListener('pointermove', e => {
    const state = appWindowResizeStates[windowId];
    if (!state || !state.resizing) return;
    
    let newWidth = state.startWidth + (e.clientX - state.startX);
    let newHeight = state.startHeight + (e.clientY - state.startY);
    
    if (newWidth < 300) newWidth = 300;
    if (newHeight < 200) newHeight = 200;
    if (newWidth > window.innerWidth) newWidth = window.innerWidth;
    if (newHeight > window.innerHeight) newHeight = window.innerHeight;
    
    state.targetWidth = newWidth;
    state.targetHeight = newHeight;
    
    if (!state.animationFrameId) {
      state.animationFrameId = requestAnimationFrame(updateWindowSize);
    }
  });

  resizeHandle.addEventListener('pointerup', e => {
    const state = appWindowResizeStates[windowId];
    if (state) {
      state.resizing = false;
    }
    try { resizeHandle.releasePointerCapture(e.pointerId); } catch {}
  });
}

function createAppWindow(url, title, showUrl, iconUrl) {
  appWindowCounter++;
  const windowId = 'appWindow' + appWindowCounter;
  
  const windowElement = document.createElement('div');
  windowElement.id = windowId;
  windowElement.style.cssText = `
    position: absolute;
    top: ${100 + appWindowCounter * 40}px;
    left: ${100 + appWindowCounter * 40}px;
    width: ${WINDOW_WIDTH}px;
    height: ${WINDOW_HEIGHT}px;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 10px 30px rgba(0, 0, 0, 0.7);
    user-select: none;
    z-index: ${maxZIndex};
    transition: none;
    min-width: 300px;
    min-height: 200px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    opacity: 0;
    animation: fadeInApp 0.3s ease-out forwards;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInApp {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `;
  if (!document.querySelector('style[data-fade-in-app]')) {
    style.setAttribute('data-fade-in-app', 'true');
    document.head.appendChild(style);
  }

  const headerElement = document.createElement('div');
  headerElement.style.cssText = `
    background: rgba(238, 238, 238, 0.2);
    height: 32px;
    cursor: grab;
    user-select: none;
    z-index: 106;
    flex-shrink: 0;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 16px 16px 0 0;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    padding: 0 14px;
    gap: 8px;
  `;

  const trafficLights = document.createElement('div');
  trafficLights.style.cssText = `
    display: flex;
    gap: 8px;
  `;

  const closeLight = document.createElement('div');
  closeLight.style.cssText = `
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ff605c;
    cursor: pointer;
  `;
  closeLight.addEventListener('click', () => closeAppWindow(windowId));

  const minLight = document.createElement('div');
  minLight.style.cssText = `
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ffbd44;
    cursor: pointer;
  `;
  minLight.addEventListener('click', () => minimizeAppWindow(windowId));

  const maxLight = document.createElement('div');
  maxLight.style.cssText = `
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #00ca4e;
    cursor: pointer;
  `;
  maxLight.addEventListener('click', () => maximizeAppWindow(windowId));

  trafficLights.appendChild(closeLight);
  trafficLights.appendChild(minLight);
  trafficLights.appendChild(maxLight);

  const titleSpan = document.createElement('span');
  titleSpan.textContent = title;
  titleSpan.style.cssText = `
    flex: 1;
    text-align: center;
    font-size: 13px;
    color: #333;
    font-weight: 500;
  `;

  headerElement.appendChild(trafficLights);
  headerElement.appendChild(titleSpan);

  const viewElement = document.createElement('div');
  viewElement.style.cssText = `
    flex: 1;
    position: relative;
    z-index: 109;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const contentContainer = document.createElement('div');
  contentContainer.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  `;

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    margin: 0;
    padding: 0;
  `;

  const titleDisplay = document.createElement('div');
  titleDisplay.textContent = title;
  titleDisplay.style.cssText = `
    font-size: 24px;
    color: #fff;
    font-weight: 600;
    text-align: center;
    position: absolute;
    pointer-events: none;
    display: none;
  `;

  contentContainer.appendChild(iframe);
  contentContainer.appendChild(titleDisplay);
  viewElement.appendChild(contentContainer);

  windowElement.appendChild(headerElement);
  windowElement.appendChild(viewElement);
  document.body.appendChild(windowElement);

  setupWindowDrag(windowElement, headerElement, windowId);
  setupWindowResize(windowElement, windowId);

  windowElement.addEventListener('pointerdown', () => {
    raiseWindowToTop(windowElement);
  });

  appWindows[windowId] = {
    element: windowElement,
    url: url,
    title: title,
    showUrl: showUrl,
    iconUrl: iconUrl,
    iframe: iframe,
    minimized: false,
    maximized: false
  };

  raiseWindowToTop(windowElement);

  return windowId;
}

function closeAppWindow(windowId) {
  const windowData = appWindows[windowId];
  if (windowData) {
    windowData.element.remove();
    delete appWindows[windowId];
    delete appWindowDragStates[windowId];
    delete appWindowResizeStates[windowId];
  }
}

function minimizeAppWindow(windowId) {
  const windowData = appWindows[windowId];
  if (windowData) {
    windowData.element.style.display = 'none';
    windowData.minimized = true;
  }
}

function maximizeAppWindow(windowId) {
  const windowData = appWindows[windowId];
  if (windowData) {
    if (!windowData.maximized) {
      windowData.previousState = {
        width: windowData.element.style.width,
        height: windowData.element.style.height,
        top: windowData.element.style.top,
        left: windowData.element.style.left,
        borderRadius: windowData.element.style.borderRadius
      };
      windowData.element.style.width = '100vw';
      windowData.element.style.height = '100vh';
      windowData.element.style.top = '0';
      windowData.element.style.left = '0';
      windowData.element.style.borderRadius = '0';
      windowData.maximized = true;
    } else {
      if (windowData.previousState) {
        windowData.element.style.width = windowData.previousState.width;
        windowData.element.style.height = windowData.previousState.height;
        windowData.element.style.top = windowData.previousState.top;
        windowData.element.style.left = windowData.previousState.left;
        windowData.element.style.borderRadius = windowData.previousState.borderRadius;
      }
      windowData.maximized = false;
    }
  }
}

function restoreAppWindow(windowId) {
  const windowData = appWindows[windowId];
  if (windowData) {
    windowData.element.style.display = 'flex';
    windowData.minimized = false;
    raiseWindowToTop(windowData.element);
  }
}

function toggleStartMenu() {
  if (startMenuOpen) {
    startMenuContainer.style.display = 'none';
    startMenuOpen = false;
  } else {
    startMenuContainer.style.display = 'block';
    startMenuOpen = true;
    raiseWindowToTop(startMenuContainer);
  }
}

function closeStartMenu() {
  if (startMenuOpen) {
    startMenuContainer.style.display = 'none';
    startMenuOpen = false;
  }
}

window.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    if (event.data.type === 'open_internet') {
      closeStartMenu();
      const iconUrl = browserBtn.querySelector('img').src;
      addTab('/search.html', 'New Tab', 'nebuli://search', iconUrl);
      wrapper.style.display = 'flex';
      minimizeBubble.style.display = 'none';
      raiseWindowToTop(wrapper);
    } 
    else if (event.data.type === 'open_games') {
      closeStartMenu();
      const iconUrl = gamesBtn.querySelector('img').src;
      if (appWindowStates.games && appWindows[appWindowStates.games]) {
        const windowData = appWindows[appWindowStates.games];
        if (windowData.minimized) {
          restoreAppWindow(appWindowStates.games);
        } else {
          raiseWindowToTop(windowData.element);
        }
      } else {
        appWindowStates.games = createAppWindow('/games.html', 'Games', 'nebuli://games', iconUrl);
      }
    }
    else if (event.data.type === 'open_tools') {
      closeStartMenu();
      const toolType = event.data.detail;
      const iconUrl = toolsBtn.querySelector('img').src;
      
      let toolUrl = '/tools.html';
      let toolTitle = 'Tools';
      
      if (toolType === 'AI') {
        toolUrl = '/ai.html';
        toolTitle = 'AI';
      } else if (toolType === 'Music') {
        toolUrl = '/musicplayer.html';
        toolTitle = 'Music Player';
      } else if (toolType === 'Editor') {
        toolUrl = '/code_editor.html';
        toolTitle = 'Code Editor';
      } else if (toolType === 'Chat') {
        toolUrl = '/chat.html';
        toolTitle = 'Chat';
      } else if (toolType === 'Movies') {
        toolUrl = '/nebuflix.html';
        toolTitle = 'Nebuflix';
      }
      
      if (appWindowStates.tools && appWindows[appWindowStates.tools]) {
        const windowData = appWindows[appWindowStates.tools];
        windowData.iframe.src = toolUrl;
        if (windowData.minimized) {
          restoreAppWindow(appWindowStates.tools);
        } else {
          raiseWindowToTop(windowData.element);
        }
      } else {
        appWindowStates.tools = createAppWindow(toolUrl, toolTitle, 'nebuli://tools', iconUrl);
      }
    }
    else if (event.data.type === 'open_files') {
      closeStartMenu();
      const iconUrl = filesBtn.querySelector('img').src;
      if (appWindowStates.files && appWindows[appWindowStates.files]) {
        const windowData = appWindows[appWindowStates.files];
        if (windowData.minimized) {
          restoreAppWindow(appWindowStates.files);
        } else {
          raiseWindowToTop(windowData.element);
        }
      } else {
        appWindowStates.files = createAppWindow('/files.html', 'Files', 'nebuli://files', iconUrl);
      }
    }
    else if (event.data.type === 'open_settings') {
      closeStartMenu();
      openSettingsInOmnibox(false);
    }
    else if (event.data.type === 'open_more') {
      closeStartMenu();
      const iconUrl = moreBtn.querySelector('img').src;
      if (appWindowStates.more && appWindows[appWindowStates.more]) {
        const windowData = appWindows[appWindowStates.more];
        if (windowData.minimized) {
          restoreAppWindow(appWindowStates.more);
        } else {
          raiseWindowToTop(windowData.element);
        }
      } else {
        appWindowStates.more = createAppWindow('/more.html', 'More', 'nebuli://more', iconUrl);
      }
    }
    else if (event.data.type === 'open_specific_game') {
      closeStartMenu();
      const gamePath = event.data.detail;
      const iconUrl = gamesBtn.querySelector('img').src;
      
      if (appWindowStates.games && appWindows[appWindowStates.games]) {
        const windowData = appWindows[appWindowStates.games];
        windowData.iframe.src = gamePath;
        if (windowData.minimized) {
          restoreAppWindow(appWindowStates.games);
        } else {
          raiseWindowToTop(windowData.element);
        }
      } else {
        appWindowStates.games = createAppWindow(gamePath, 'Games', 'nebuli://games', iconUrl);
      }
    }
    else if (event.data.type === 'open_specific_file') {
      closeStartMenu();
      const filePath = event.data.detail;
      const iconUrl = filesBtn.querySelector('img').src;
      
      const fileUrl = '/files.html?' + filePath;
      
      if (appWindowStates.files && appWindows[appWindowStates.files]) {
        const windowData = appWindows[appWindowStates.files];
        windowData.iframe.src = fileUrl;
        if (windowData.minimized) {
          restoreAppWindow(appWindowStates.files);
        } else {
          raiseWindowToTop(windowData.element);
        }
      } else {
        appWindowStates.files = createAppWindow(fileUrl, 'Files', 'nebuli://files', iconUrl);
      }
    }
    else if (event.data.type === 'close_start') {
      const startMenuFrameIframe = document.getElementById('startMenuFrame');
      if (startMenuFrameIframe && event.source === startMenuFrameIframe.contentWindow) {
        const tabToClose = document.querySelector('.tab.active');
        if (tabToClose) {
          const tabId = tabToClose.dataset.id;
          closeTab(tabId);
        }
      }
    }
  }
});

if (startMenuBtn) {
  startMenuBtn.addEventListener('click', toggleStartMenu);
}

document.addEventListener('click', (e) => {
  if (startMenuOpen && !startMenuContainer.contains(e.target) && !startMenuBtn.contains(e.target)) {
    closeStartMenu();
  }
});

tabs.addEventListener('pointerdown', e => {
  if (wrapper.classList.contains('immersive-fullscreen')) return;
  const clickedTab = e.target.closest('.tab');
  const clickedTraffic = e.target.closest('.traffic');
  const clickedNewTab = e.target.closest('#newTab');
  const isInput = e.target.tagName === 'INPUT';
  const isTabClose = e.target.classList.contains('tab-close');
  if (clickedTab || clickedTraffic || clickedNewTab || isInput || isTabClose) return;
  
  wrapperDragState.dragging = true;
  const rect = wrapper.getBoundingClientRect();
  wrapperDragState.dragOffsetX = e.clientX - rect.left;
  wrapperDragState.dragOffsetY = e.clientY - rect.top;
  
  wrapperDragState.currentX = rect.left;
  wrapperDragState.currentY = rect.top;
  wrapperDragState.targetX = rect.left;
  wrapperDragState.targetY = rect.top;
  
  tabs.style.cursor = 'grabbing';
  wrapper.style.transition = 'none';
  wrapper.style.transform = 'none';
  raiseWindowToTop(wrapper);
  e.preventDefault();
});

document.addEventListener('pointermove', e => {
  if (!wrapperDragState.dragging) return;
  
  let newLeft = e.clientX - wrapperDragState.dragOffsetX;
  let newTop = e.clientY - wrapperDragState.dragOffsetY;
  
  const maxLeft = window.innerWidth - wrapper.offsetWidth;
  const maxTop = window.innerHeight - wrapper.offsetHeight;
  
  if (newLeft < 0) newLeft = 0;
  if (newTop < 0) newTop = 0;
  if (newLeft > maxLeft) newLeft = maxLeft;
  if (newTop > maxTop) newTop = maxTop;
  
  wrapperDragState.targetX = newLeft;
  wrapperDragState.targetY = newTop;
  
  if (!wrapperDragState.animationFrameId) {
    wrapperDragState.animationFrameId = requestAnimationFrame(updateWrapperPosition);
  }
});

document.addEventListener('pointerup', e => {
  if (wrapperDragState.dragging) {
    wrapperDragState.dragging = false;
    tabs.style.cursor = 'grab';
    wrapper.style.transition = '';
  }
});

let resizing = false;
let startX, startY, startWidth, startHeight;

if (resizeHandle) {
  resizeHandle.addEventListener('pointerdown', e => {
    if (wrapper.classList.contains('fullscreen') || wrapper.classList.contains('immersive-fullscreen')) return;
    resizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = wrapper.offsetWidth;
    startHeight = wrapper.offsetHeight;
    e.preventDefault();
    resizeHandle.setPointerCapture(e.pointerId);
  });

  resizeHandle.addEventListener('pointermove', e => {
    if (!resizing) return;
    let newWidth = startWidth + (e.clientX - startX);
    let newHeight = startHeight + (e.clientY - startY);
    if (newWidth < 300) newWidth = 300;
    if (newHeight < 200) newHeight = 200;
    if (newWidth > window.innerWidth) newWidth = window.innerWidth;
    if (newHeight > window.innerHeight) newHeight = window.innerHeight;
    wrapper.style.width = newWidth + 'px';
    wrapper.style.height = newHeight + 'px';
  });

  resizeHandle.addEventListener('pointerup', e => {
    resizing = false;
    try { resizeHandle.releasePointerCapture(e.pointerId); } catch {}
  });
}

const view = document.getElementById('view');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const reloadBtn = document.getElementById('reloadBtn');
const urlInput = document.getElementById('urlInput');
const newTabBtn = document.getElementById('newTab');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const fullscreenIcon = document.getElementById('fullscreenIcon');

let histories = {};
let tabCounter = 0;

function setFavicon(url) {
  let link = document.getElementById('dynamicFavicon');
  if (!link) {
    link = document.createElement('link');
    link.id = 'dynamicFavicon';
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

function truncateTitle(str) {
  if (!str) return '';
  if (str.length <= 5) return str;
  return str.slice(0, 5) + '...';
}

function getFavicon(url) {
  try {
    const u = new URL(url);
    return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(u.href)}&size=128`;
  } catch {
    return 'https://assets.nebulilabs.xyz/NebuliOS/internet.png';
  }
}

function decodeProxyUrl(url) {
  if (!url) return url;

  if (url.includes('/p/light/light/')) {
    try {
      let part = url.split('/p/light/light/')[1];
      if (!part) return url;
      let decoded = decodeURIComponent(part)
        .split('')
        .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt() ^ 2) : char))
        .join('');
      return decoded;
    } catch (e) { return url; }
  }

  if (url.includes('/p/sonic/s/')) {
    try {
      let part = url.split('/p/sonic/s/')[1];
      if (!part) return url;
      return decodeURIComponent(part);
    } catch (e) { return url; }
  }

  return url;
}

function getDecodedPageTitle(iframeElement) {
  try {
    const frameDoc = iframeElement.contentDocument || iframeElement.contentWindow.document;
    if (!frameDoc) return null;
    return frameDoc.title || null;
  } catch (e) {
    return null;
  }
}

function syncAddressBar(id, iframeElement, inputElement) {
  const h = histories[id];
  if (!h) return;

  if (document.activeElement === inputElement) {
    return;
  }

  try {
    const frameWin = iframeElement.contentWindow;
    let currentUrl = frameWin.location.href;
    
    let innerIframe = frameWin.document.querySelector('iframe');
    if (innerIframe) {
      try {
        currentUrl = innerIframe.contentWindow.location.href;
      } catch (e) {
      }
    }

    let displayUrl = decodeProxyUrl(currentUrl);
    let isApp = false;
    let shouldSkip = false;

    if (h.showUrl === 'nebuli://search' && currentUrl.includes('/search.html')) {
      shouldSkip = true;
    }

    if (h.showUrl === 'nebuli://settings') {
      shouldSkip = true;
    }

    if (shouldSkip) {
      return;
    }

    for (let slug in REDIRECTS) {
      if (currentUrl.split('#')[0] === REDIRECTS[slug] || currentUrl === REDIRECTS[slug]) {
        displayUrl = CUSTOM_PROTOCOL + slug;
        isApp = true;
        break;
      }
    }

    if (!isApp && (displayUrl === CUSTOM_PROTOCOL + 'home')) {
      displayUrl = '';
    }

    if (currentUrl.includes('/setup.html')) {
      displayUrl = 'nebuli://setup';
    }

    inputElement.value = displayUrl;

    const pageTitle = getDecodedPageTitle(iframeElement);
    if (pageTitle && pageTitle.length > 0) {
      const tab = tabs.querySelector(`.tab[data-id="${id}"]`);
      if (tab) {
        const titleSpan = tab.querySelector('.tab-title');
        if (titleSpan) {
          titleSpan.textContent = truncateTitle(pageTitle);
        }
        tab.title = pageTitle;
      }
    }

    setFavicon(getFavicon(displayUrl || currentUrl));

  } catch (e) {
  }
}

const navigation = {
  back: (iframeElement) => {
    try {
      iframeElement.contentWindow.history.back();
    } catch (e) { }
  },
  
  forward: (iframeElement) => {
    try {
      iframeElement.contentWindow.history.forward();
    } catch (e) { }
  },
  
  reload: (iframeElement) => {
    try {
      iframeElement.contentWindow.location.reload();
    } catch (e) { }
  }
};

function setupTabDrag(tab) {
  let pointerDown = false;
  let startXlocal = 0;
  let startYlocal = 0;
  let localOffsetX = 0;
  tab.addEventListener('pointerdown', e => {
    if (e.target.classList.contains('tab-close')) return;
    if (wrapper.classList.contains('immersive-fullscreen')) return;
    pointerDown = true;
    startXlocal = e.clientX;
    startYlocal = e.clientY;
    const rect = tab.getBoundingClientRect();
    localOffsetX = e.clientX - rect.left;
    try { tab.setPointerCapture(e.pointerId); } catch {}
    e.stopPropagation();
  });
  tab.addEventListener('pointermove', e => {
    if (!pointerDown) return;
    const dx = e.clientX - startXlocal;
    const dy = e.clientY - startYlocal;
    if (!tabDragging && Math.hypot(dx, dy) > 6) {
      tabDragging = true;
      tab.classList.add('dragging');
      tabDragOffsetX = localOffsetX;
      const rect = tab.getBoundingClientRect();
      tab.style.left = e.clientX - tabDragOffsetX + 'px';
      tab.style.top = rect.top + 'px';
      tabPlaceholder = document.createElement('div');
      tabPlaceholder.className = 'tab-placeholder';
      tabs.insertBefore(tabPlaceholder, tab);
    }
    if (!tabDragging) return;
    let newX = e.clientX - tabDragOffsetX;
    tab.style.left = newX + 'px';
    const otherTabs = [...tabs.querySelectorAll('.tab:not(.dragging)')];
    const rects = otherTabs.map(t => t.getBoundingClientRect());
    let bestMatch = null;
    let minDistance = Infinity;
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(e.clientX - center);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = otherTabs[i];
      }
    }
    if (bestMatch) {
      const rectB = bestMatch.getBoundingClientRect();
      const mid = rectB.left + rectB.width / 2;
      if (e.clientX < mid) {
        tabs.insertBefore(tabPlaceholder, bestMatch);
      } else {
        tabs.insertBefore(tabPlaceholder, bestMatch.nextElementSibling);
      }
    }
  });
  tab.addEventListener('pointerup', e => {
    if (pointerDown && tabDragging) {
      tab.classList.remove('dragging');
      tab.style.left = '';
      tab.style.top = '';
      if (tabPlaceholder && tabPlaceholder.parentNode) {
        tabPlaceholder.replaceWith(tab);
      }
      tabDragging = false;
    }
    pointerDown = false;
    try { tab.releasePointerCapture(e.pointerId); } catch {}
  });
}

function addTab(url, title = 'New Tab', showUrl = null, iconUrl = null) {
  tabCounter++;
  const id = 'tab' + tabCounter;

  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.dataset.id = id;
  tab.setAttribute('role', 'tab');
  tab.setAttribute('tabindex', '0');
  tab.setAttribute('aria-selected', 'false');
  tab.title = title;

  const favicon = document.createElement('img');
  favicon.className = 'favicon';

  const iconSourceUrl = showUrl || url;

  const finalIconUrl = iconUrl || (iconSourceUrl.startsWith('nebuli://') ? getTaskbarIconForInternal(iconSourceUrl) : getFavicon(iconSourceUrl));
  favicon.src = finalIconUrl;
  favicon.alt = '';
  favicon.ariaHidden = true;

  const titleSpan = document.createElement('span');
  titleSpan.className = 'tab-title';
  titleSpan.textContent = truncateTitle(title);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'tab-close';
  closeBtn.textContent = '×';
  closeBtn.title = 'Close tab';
  closeBtn.setAttribute('aria-label', 'Close tab');

  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    closeTab(id);
  });

  closeBtn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      closeTab(id);
    }
  });

  tab.addEventListener('click', () => {
    if (!tabDragging) {
      activateTab(id);
    }
  });
  tab.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activateTab(id);
    }
  });

  setupTabDrag(tab);

  tab.appendChild(favicon);
  tab.appendChild(titleSpan);
  tab.appendChild(closeBtn);

  tabs.appendChild(tab);

  let panel;
  if (url === 'nebuli://settings' || url === 'nebuli://setup') {
    panel = document.createElement('div');
    panel.className = 'panel active settings-page';
    panel.dataset.id = id;
    panel.title = title;

    const settingsContent = settingsTemplate.cloneNode(true);
    settingsContent.id = 'settingsPanelContent' + id;
    settingsContent.style.display = 'block';
    panel.appendChild(settingsContent);

    histories[id] = { stack: [url], idx: 0, panel: panel, showUrl: showUrl || url, isInternal: true, iconUrl: finalIconUrl };

  } else {
    panel = document.createElement('iframe');
    panel.className = 'panel active';
    panel.dataset.id = id;
    panel.title = title;

    histories[id] = { stack: [url], idx: 0, iframe: panel, showUrl: showUrl || url, isInternal: false, iconUrl: finalIconUrl };
    
    panel.src = url;
  }

  view.appendChild(panel);
  activateTab(id);

  if (url === 'nebuli://settings') {
    setupSettingsBindings(panel);
  } else if (url === 'nebuli://setup') {
    setupSettingsBindings(panel);
    const settingsContent = panel.querySelector('#settingsPanelContent' + id);
    if (settingsContent) {
      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.gap = '10px';
      footer.style.marginTop = '12px';
      const finishBtn = document.createElement('button');
      finishBtn.textContent = 'Finish Setup';
      finishBtn.style.padding = '10px';
      finishBtn.style.borderRadius = '8px';
      finishBtn.style.border = 'none';
      finishBtn.style.background = '#007aff';
      finishBtn.style.color = '#fff';
      finishBtn.style.cursor = 'pointer';
      finishBtn.addEventListener('click', () => {
        saveAllSettings(panel);
        localStorage.setItem('opened-once', 'true');
        closeTab(id);
        const iconUrl = document.querySelector('#browserBtn img').src;
        addTab('/search.html', 'New Tab', 'nebuli://search', iconUrl);
        wrapper.style.display = 'flex';
        minimizeBubble.style.display = 'none';
      });
      const skipBtn = document.createElement('button');
      skipBtn.textContent = 'Skip';
      skipBtn.style.padding = '10px';
      skipBtn.style.borderRadius = '8px';
      skipBtn.style.border = '1px solid #ccc';
      skipBtn.style.background = '#fff';
      skipBtn.style.cursor = 'pointer';
      skipBtn.addEventListener('click', () => {
        localStorage.setItem('opened-once', 'true');
        closeTab(id);
        const iconUrl = document.querySelector('#browserBtn img').src;
        addTab('/search.html', 'New Tab', 'nebuli://search', iconUrl);
        wrapper.style.display = 'flex';
        minimizeBubble.style.display = 'none';
      });
      footer.appendChild(finishBtn);
      footer.appendChild(skipBtn);
      settingsContent.appendChild(footer);
    }
  }

  wrapper.style.display = 'flex';
  minimizeBubble.style.display = 'none';

  updateNavButtons();
  return id;
}

function activateTab(id) {
  [...tabs.querySelectorAll('.tab')].forEach(t => {
    t.classList.toggle('active', t.dataset.id == id);
    t.setAttribute('aria-selected', t.dataset.id == id ? 'true' : 'false');
  });
  [...view.querySelectorAll('.panel')].forEach(f => {
    f.classList.toggle('active', f.dataset.id == id);
  });
  const h = histories[id];
  if (h) {
    urlInput.value = h.showUrl;
    updateNavButtons();

    const activeTab = tabs.querySelector(`.tab[data-id="${id}"]`);
    if (activeTab) {
      const tabFavicon = activeTab.querySelector('.favicon');
      if (tabFavicon) {
        setFavicon(tabFavicon.src);
      }
    }
  }
}

function closeTab(id) {
  const tab = tabs.querySelector(`.tab[data-id="${id}"]`);
  const panel = view.querySelector(`.panel[data-id="${id}"]`);
  if (tab) tab.remove();
  if (panel) panel.remove();
  delete histories[id];
  const remainingTabs = [...tabs.querySelectorAll('.tab')];
  if (remainingTabs.length > 0) {
    activateTab(remainingTabs[remainingTabs.length - 1].dataset.id);
  } else {
    wrapper.style.display = 'none';
    minimizeBubble.style.display = 'none';
    setFavicon('https://assets.nebulilabs.xyz/NebuliOS/internet.png');
  }
}

function navigate(id, url) {
  const h = histories[id];
  if (!h || h.isInternal) return;

  if (h.idx < h.stack.length - 1) {
    h.stack.splice(h.idx + 1);
  }
  h.stack.push(url);
  h.idx++;
  h.iframe.src = url;
  h.showUrl = url;
  urlInput.value = h.showUrl;
  updateTabDisplay(id, url);
}

function updateTabDisplay(id, url) {
  const tab = tabs.querySelector(`.tab[data-id="${id}"]`);
  if (!tab) return;
  const fav = tab.querySelector('.favicon');
  const h = histories[id];
  const sourceUrl = h.isInternal ? h.showUrl : url;
  const newFaviconUrl = sourceUrl.startsWith('nebuli://') ? getTaskbarIconForInternal(sourceUrl) : getFavicon(sourceUrl);
  if (fav) fav.src = newFaviconUrl;
  setFavicon(newFaviconUrl);
  const titleSpan = tab.querySelector('.tab-title');
  let displayTitle = url;
  try {
    const u = new URL(url);
    displayTitle = u.hostname;
  } catch { }
  tab.title = displayTitle;
  if (titleSpan) {
    titleSpan.textContent = truncateTitle(displayTitle);
  }
}

function goBack() {
  const id = currentTabId();
  const h = histories[id];
  if (h && !h.isInternal) {
    const panel = view.querySelector(`.panel[data-id="${id}"]`);
    if (panel && panel.tagName === 'IFRAME') {
      navigation.back(panel);
    }
  }
}

function goForward() {
  const id = currentTabId();
  const h = histories[id];
  if (h && !h.isInternal) {
    const panel = view.querySelector(`.panel[data-id="${id}"]`);
    if (panel && panel.tagName === 'IFRAME') {
      navigation.forward(panel);
    }
  }
}

function reload() {
  const id = currentTabId();
  const h = histories[id];
  if (h && !h.isInternal) {
    const panel = view.querySelector(`.panel[data-id="${id}"]`);
    if (panel && panel.tagName === 'IFRAME') {
      navigation.reload(panel);
    }
  }
}

function currentTabId() {
  const activeTab = document.querySelector('.tab.active');
  return activeTab ? activeTab.dataset.id : null;
}

function updateNavButtons() {
  const id = currentTabId();
  const h = histories[id];
  if (!h || h.isInternal) {
    backBtn.disabled = true;
    forwardBtn.disabled = true;
    reloadBtn.disabled = true;
  } else {
    backBtn.disabled = false;
    forwardBtn.disabled = false;
    reloadBtn.disabled = false;
  }
}

if (backBtn) backBtn.addEventListener('click', () => goBack());
if (forwardBtn) forwardBtn.addEventListener('click', () => goForward());
if (reloadBtn) reloadBtn.addEventListener('click', () => reload());

urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    let val = urlInput.value.trim();
    if (!val) return;
    let realUrl;
    let displayUrl = 'nebuli://web';
    if (val === 'nebuli://settings') {
      openSettingsInOmnibox(true);
      e.preventDefault();
      return;
    }
    const pBase = PROXY_EMBED_URL;
    if (val.startsWith('http://') || val.startsWith('https://')) {
      realUrl = pBase + val;
      displayUrl = val;
    } else if (val.startsWith('nebuli://') || val.startsWith('/')) {
      realUrl = val;
      displayUrl = val;
    } else {
      if (!val.includes('.') && !val.includes(' ')) {
        realUrl = pBase + 'https://duckduckgo.com/?q=' + encodeURIComponent(val);
        displayUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent(val);
      } else {
        realUrl = pBase + 'https://duckduckgo.com/?q=' + encodeURIComponent(val);
        displayUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent(val);
      }
    }
    const id = currentTabId();
    if (id) {
      navigate(id, realUrl);
      urlInput.value = displayUrl;
    }
  }
});

if (newTabBtn) {
  newTabBtn.addEventListener('click', () => {
    const iconUrl = document.querySelector('#browserBtn img').src;
    addTab('/search.html', 'New Tab', 'nebuli://search', iconUrl);
    const computed = getComputedStyle(wrapper).display;
    if (computed === 'none') {
      wrapper.style.display = 'flex';
      minimizeBubble.style.display = 'none';
    }
  });
}

const browserBtn = document.getElementById('browserBtn');
const gamesBtn = document.getElementById('gamesBtn');
const toolsBtn = document.getElementById('toolsBtn');
const filesBtn = document.getElementById('filesBtn');
const moreBtn = document.getElementById('moreBtn');
const taskbarSettingsBtn = document.getElementById('taskbarSettingsBtn');

let appWindowStates = {
  games: null,
  tools: null,
  files: null,
  more: null
};

function getTaskbarIconForInternal(url) {
  if (url.includes('search')) return browserBtn.querySelector('img').src;
  if (url.includes('games')) return gamesBtn.querySelector('img').src;
  if (url.includes('tools')) return toolsBtn.querySelector('img').src;
  if (url.includes('files')) return filesBtn.querySelector('img').src;
  if (url.includes('more')) return moreBtn.querySelector('img').src;
  if (url.includes('settings')) return taskbarSettingsBtn.querySelector('img').src;
  if (url.includes('setup')) return taskbarSettingsBtn.querySelector('img').src;
  return browserBtn.querySelector('img').src;
}

if (browserBtn) {
  browserBtn.addEventListener('click', () => {
    const iconUrl = browserBtn.querySelector('img').src;
    addTab('/search.html', 'New Tab', 'nebuli://search', iconUrl);
    const computed = getComputedStyle(wrapper).display;
    if (computed === 'none') {
      wrapper.style.display = 'flex';
      minimizeBubble.style.display = 'none';
    }
    raiseWindowToTop(wrapper);
  });
}

if (gamesBtn) {
  gamesBtn.addEventListener('click', () => {
    const iconUrl = gamesBtn.querySelector('img').src;
    if (appWindowStates.games && appWindows[appWindowStates.games]) {
      const windowData = appWindows[appWindowStates.games];
      if (windowData.minimized) {
        restoreAppWindow(appWindowStates.games);
      } else {
        raiseWindowToTop(windowData.element);
      }
    } else {
      appWindowStates.games = createAppWindow('/games.html', 'Games', 'nebuli://games', iconUrl);
    }
  });
}

if (toolsBtn) {
  toolsBtn.addEventListener('click', () => {
    const iconUrl = toolsBtn.querySelector('img').src;
    if (appWindowStates.tools && appWindows[appWindowStates.tools]) {
      const windowData = appWindows[appWindowStates.tools];
      if (windowData.minimized) {
        restoreAppWindow(appWindowStates.tools);
      } else {
        raiseWindowToTop(windowData.element);
      }
    } else {
      appWindowStates.tools = createAppWindow('/tools.html', 'Tools', 'nebuli://tools', iconUrl);
    }
  });
}

if (filesBtn) {
  filesBtn.addEventListener('click', () => {
    const iconUrl = filesBtn.querySelector('img').src;
    if (appWindowStates.files && appWindows[appWindowStates.files]) {
      const windowData = appWindows[appWindowStates.files];
      if (windowData.minimized) {
        restoreAppWindow(appWindowStates.files);
      } else {
        raiseWindowToTop(windowData.element);
      }
    } else {
      appWindowStates.files = createAppWindow('/files.html', 'Files', 'nebuli://files', iconUrl);
    }
  });
}

if (moreBtn) {
  moreBtn.addEventListener('click', () => {
    const iconUrl = moreBtn.querySelector('img').src;
    if (appWindowStates.more && appWindows[appWindowStates.more]) {
      const windowData = appWindows[appWindowStates.more];
      if (windowData.minimized) {
        restoreAppWindow(appWindowStates.more);
      } else {
        raiseWindowToTop(windowData.element);
      }
    } else {
      appWindowStates.more = createAppWindow('/more.html', 'More', 'nebuli://more', iconUrl);
    }
  });
}

const trafficClose = document.querySelector('.close');
const trafficMin = document.querySelector('.min');
const trafficMax = document.querySelector('.max');

function applyMaximizedStyles() {
  wrapper.style.width = '100vw';
  wrapper.style.height = '100vh';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.transform = 'none';
  minimizeBubble.style.display = 'none';
}

function applyRestoredStyles() {
  wrapper.style.width = '80vw';
  wrapper.style.height = '80vh';
  wrapper.style.top = '10%';
  wrapper.style.left = '50%';
  wrapper.style.transform = 'translateX(-50%)';
}

function toggleMaximize() {
  if (wrapper.classList.contains('immersive-fullscreen')) {
    exitImmersiveFullscreen();
    return;
  }

  const isMaximized = wrapper.classList.toggle('fullscreen');

  if (isMaximized) {
    applyMaximizedStyles();
    trafficMax.title = 'Restore Omnibox';
  } else {
    applyRestoredStyles();
    trafficMax.title = 'Maximize/Restore Omnibox';
  }
  wrapper.style.display = 'flex';
}

function toggleImmersiveFullscreen() {
  const isImmersive = wrapper.classList.contains('immersive-fullscreen');

  if (!isImmersive) {
    wrapper.classList.add('immersive-fullscreen');
    wrapper.classList.remove('fullscreen');

    applyMaximizedStyles();

    if (fullscreenIcon) {
      fullscreenIcon.src = 'https://assets.nebulilabs.xyz/NebuliOS/close.png';
      fullscreenBtn.title = 'Exit Fullscreen';
    }
    trafficMax.title = 'Maximize/Restore Omnibox';

  } else {
    exitImmersiveFullscreen();
  }
  wrapper.style.display = 'flex';
}

function exitImmersiveFullscreen() {
  wrapper.classList.remove('immersive-fullscreen');
  applyRestoredStyles();

  if (fullscreenIcon) {
    fullscreenIcon.src = 'https://assets.nebulilabs.xyz/NebuliOS/fullscreen.png';
    fullscreenBtn.title = 'Toggle Fullscreen';
  }
  trafficMax.title = 'Maximize/Restore Omnibox';
}

if (trafficClose) {
  trafficClose.addEventListener('click', () => {
    [...tabs.querySelectorAll('.tab')].forEach(t => {
      const id = t.dataset.id;
      closeTab(id);
    });
    wrapper.style.display = 'none';
    minimizeBubble.style.display = 'none';
    setFavicon('https://assets.nebulilabs.xyz/NebuliOS/internet.png');
  });
}

if (trafficMin) {
  trafficMin.addEventListener('click', () => {
    wrapper.style.display = 'none';
    minimizeBubble.style.display = 'flex';
  });
}

if (trafficMax) {
  trafficMax.addEventListener('click', toggleMaximize);
}

if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', toggleImmersiveFullscreen);
}

if (minimizeBubble) {
  minimizeBubble.addEventListener('click', () => {
    wrapper.style.display = 'flex';
    minimizeBubble.style.display = 'none';
  });

  minimizeBubble.addEventListener('pointerdown', e => {
    bubbleDragState.dragging = true;
    bubbleDragState.bubbleOffsetX = e.clientX - minimizeBubble.offsetLeft;
    bubbleDragState.bubbleOffsetY = e.clientY - minimizeBubble.offsetTop;
    bubbleDragState.currentX = minimizeBubble.offsetLeft;
    bubbleDragState.currentY = minimizeBubble.offsetTop;
    bubbleDragState.targetX = minimizeBubble.offsetLeft;
    bubbleDragState.targetY = minimizeBubble.offsetTop;
    minimizeBubble.style.cursor = 'grabbing';
  });
}

document.addEventListener('pointermove', e => {
  if (bubbleDragState.dragging) {
    let newLeft = e.clientX - bubbleDragState.bubbleOffsetX;
    let newTop = e.clientY - bubbleDragState.bubbleOffsetY;
    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;
    if (newLeft + minimizeBubble.offsetWidth > window.innerWidth) newLeft = window.innerWidth - minimizeBubble.offsetWidth;
    if (newTop + minimizeBubble.offsetHeight > window.innerHeight) newTop = window.innerHeight - minimizeBubble.offsetHeight;
    bubbleDragState.targetX = newLeft;
    bubbleDragState.targetY = newTop;
    if (!bubbleDragState.animationFrameId) {
      bubbleDragState.animationFrameId = requestAnimationFrame(updateBubblePosition);
    }
  }
});

document.addEventListener('pointerup', e => {
  if (bubbleDragState.dragging) {
    bubbleDragState.dragging = false;
    minimizeBubble.style.cursor = 'grab';
  }
});

wrapper.addEventListener('pointerdown', () => {
  raiseWindowToTop(wrapper);
});

setInterval(() => {
  const id = currentTabId();
  if (id) {
    const h = histories[id];
    if (h && !h.isInternal) {
      const panel = view.querySelector(`.panel[data-id="${id}"]`);
      if (panel && panel.tagName === 'IFRAME') {
        syncAddressBar(id, panel, urlInput);
      }
    }
  }
}, 500);

window.addEventListener('load', () => {
  wrapper.style.display = 'none';
  minimizeBubble.style.display = 'none';
  initializeDefaults();
});

const centerTimeEl = document.getElementById('centerTime');
const centerBatteryEl = document.getElementById('centerBattery');
const statusTimeEl = document.getElementById('statusTime');
const statusBatteryEl = document.getElementById('statusBattery');

function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  centerTimeEl.textContent = now.toLocaleTimeString();
  statusTimeEl.textContent = timeString;
}
setInterval(updateTime, 1000);
updateTime();

if ('getBattery' in navigator) {
  navigator.getBattery().then(battery => {
    function updateBattery() {
      const batteryPct = (battery.level * 100).toFixed(0);
      const batteryText = `Battery: ${batteryPct}%`;
      centerBatteryEl.textContent = batteryText;
      statusBatteryEl.textContent = `${batteryPct}%`;
    }
    battery.addEventListener('levelchange', updateBattery);
    updateBattery();
  });
} else {
  centerBatteryEl.textContent = 'Battery: N/A';
  statusBatteryEl.textContent = 'N/A';
}

const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let stars = [];
const STAR_COUNT = 200;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

class Star {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = randomRange(0, canvas.width);
    this.y = randomRange(0, canvas.height);
    this.size = randomRange(0.5, 1.5);
    this.speed = randomRange(0.2, 1.0);
    this.alpha = randomRange(0.3, 1.0);
  }
  update() {
    this.x -= this.speed;
    if (this.x < 0) this.reset();
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 8;
    ctx.fill();
  }
}

function initStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push(new Star());
  }
}

function animateStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const star of stars) {
    star.update();
    star.draw();
  }
  requestAnimationFrame(animateStars);
}

initStars();
animateStars();

const taskbar = document.querySelector('.taskbar');
const taskbarCollapsedHint = document.getElementById('taskbarCollapsedHint');
const DEFAULT_POSITION = 'bottom';
const DEFAULT_FULL = false;
const DEFAULT_APPEARANCE_TYPE = 'glassy';
const DEFAULT_SOLID_COLOR = '#333333';
const DEFAULT_GRADIENT_COLOR1 = '#007aff';
const DEFAULT_GRADIENT_COLOR2 = '#5ac8fa';
const DEFAULT_p = 'light';
const DEFAULT_WISP = 'wss://wisp.rhw.one/';
const DEFAULT_BARE = 'https://larp.foundation/tspmo/';
const DEFAULT_COLLAPSE = false;
const POSITIONS = ['bottom', 'top', 'left', 'right'];

let taskbarCollapsed = false;
let taskbarCollapseTimeout = null;

function toggleAppearanceInputs(panel) {
  const currentType = localStorage.getItem('nebuli-taskbar-appearance-type') || DEFAULT_APPEARANCE_TYPE;
  const solidSettings = panel.querySelector('#solidColorSettings');
  const gradientSettings = panel.querySelector('#gradientColorSettings');
  if (solidSettings) solidSettings.style.display = currentType === 'solid' ? 'block' : 'none';
  if (gradientSettings) gradientSettings.style.display = currentType === 'gradient' ? 'block' : 'none';
}

function getStoredCustomApps() {
  const stored = localStorage.getItem('nebuli-custom-apps');
  return stored ? JSON.parse(stored) : [];
}

function addStoredCustomApp(url, title) {
  const apps = getStoredCustomApps();
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const icon = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=128`;
    apps.push({ url, title, icon });
    localStorage.setItem('nebuli-custom-apps', JSON.stringify(apps));
  } catch (e) {
    return false;
  }
  return true;
}

function removeCustomApp(index) {
  const apps = getStoredCustomApps();
  apps.splice(index, 1);
  localStorage.setItem('nebuli-custom-apps', JSON.stringify(apps));
}

function renderCustomAppButtons() {
  const container = document.getElementById('customAppsContainer');
  if (!container) return;
  container.innerHTML = '';
  const apps = getStoredCustomApps();
  apps.forEach((app, index) => {
    const btn = document.createElement('button');
    btn.className = 'custom-app-btn';
    btn.title = app.title;
    btn.innerHTML = `<img src="${app.icon}" alt="${app.title}" style="border-radius: 4px;">`;
    btn.addEventListener('click', () => {
      const windowKey = 'customApp_' + index;
      if (appWindowStates[windowKey] && appWindows[appWindowStates[windowKey]]) {
        const windowData = appWindows[appWindowStates[windowKey]];
        if (windowData.minimized) {
          restoreAppWindow(appWindowStates[windowKey]);
        } else {
          raiseWindowToTop(windowData.element);
        }
      } else {
        const embedUrl = '/embed.html#' + app.url;
        const newWindowId = createAppWindow(embedUrl, app.title, app.url, app.icon);
        appWindowStates[windowKey] = newWindowId;
      }
    });
    container.appendChild(btn);
  });
}

function loadCustomApps(panel) {
  const customAppsList = panel.querySelector('#customAppsList');
  if (!customAppsList) return;
  customAppsList.innerHTML = '';
  const apps = getStoredCustomApps();
  apps.forEach((app, index) => {
    const appItem = document.createElement('div');
    appItem.className = 'custom-app-item';
    const hostname = new URL(app.url).hostname || '';
    appItem.innerHTML = `
      <div class="custom-app-item-info">
        <img src="${app.icon}" alt="${app.title}" class="custom-app-item-icon" onerror="this.src='https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(app.url)}&size=128'">
        <div class="custom-app-item-details">
          <div class="custom-app-item-title">${app.title}</div>
          <div class="custom-app-item-url">${app.url}</div>
        </div>
      </div>
      <button class="custom-app-item-remove" data-index="${index}">Remove</button>
    `;
    appItem.querySelector('.custom-app-item-remove').addEventListener('click', () => {
      removeCustomApp(index);
      loadCustomApps(panel);
      renderCustomAppButtons();
    });
    customAppsList.appendChild(appItem);
  });
}

function loadAllSettings(panel) {
  const taskbarFullCheckbox = panel.querySelector('#taskbarFullCheckbox');
  const taskbarCollapseCheckbox = panel.querySelector('#taskbarCollapseCheckbox');
  const taskbarPositionSelect = panel.querySelector('#taskbarPositionSelect');
  const appearanceTypeSelect = panel.querySelector('#appearanceTypeSelect');
  const solidColorInput = panel.querySelector('#solidColorInput');
  const gradientColor1Input = panel.querySelector('#gradientColor1Input');
  const gradientColor2Input = panel.querySelector('#gradientColor2Input');
  const pSelect = panel.querySelector('#pSelect');
  const wispInput = panel.querySelector('#wispInput');
  const bareInput = panel.querySelector('#bareInput');
  const isFull = localStorage.getItem('nebuli-taskbar-full');
  const isCollapse = localStorage.getItem('nebuli-taskbar-collapse');
  const position = localStorage.getItem('nebuli-taskbar-position');
  const appearanceType = localStorage.getItem('nebuli-taskbar-appearance-type');
  const solidColor = localStorage.getItem('nebuli-taskbar-solid-color');
  const color1 = localStorage.getItem('nebuli-taskbar-gradient-color1');
  const color2 = localStorage.getItem('nebuli-taskbar-gradient-color2');
  const p = localStorage.getItem('nebuli-p');
  const wisp = localStorage.getItem('wisp');
  const bare = localStorage.getItem('bare');

  if (taskbarFullCheckbox) {
    taskbarFullCheckbox.checked = isFull === 'true';
  }
  if (taskbarCollapseCheckbox) {
    taskbarCollapseCheckbox.checked = isCollapse === 'true';
  }
  if (taskbarPositionSelect) {
    taskbarPositionSelect.value = POSITIONS.includes(position) ? position : DEFAULT_POSITION;
  }
  if (appearanceTypeSelect) {
    appearanceTypeSelect.value = appearanceType || DEFAULT_APPEARANCE_TYPE;
  }
  if (solidColorInput) {
    solidColorInput.value = solidColor || DEFAULT_SOLID_COLOR;
  }
  if (gradientColor1Input) {
    gradientColor1Input.value = color1 || DEFAULT_GRADIENT_COLOR1;
  }
  if (gradientColor2Input) {
    gradientColor2Input.value = color2 || DEFAULT_GRADIENT_COLOR2;
  }
  if (pSelect) {
    pSelect.value = p || DEFAULT_p;
  }
  if (wispInput) {
    wispInput.value = wisp || DEFAULT_WISP;
  }
  if (bareInput) {
    bareInput.value = bare || DEFAULT_BARE;
  }

  loadCustomApps(panel);

  if (panel) toggleAppearanceInputs(panel);
}

function saveAllSettings(panel) {
  const taskbarFullCheckbox = panel.querySelector('#taskbarFullCheckbox');
  const taskbarCollapseCheckbox = panel.querySelector('#taskbarCollapseCheckbox');
  const taskbarPositionSelect = panel.querySelector('#taskbarPositionSelect');
  const appearanceTypeSelect = panel.querySelector('#appearanceTypeSelect');
  const solidColorInput = panel.querySelector('#solidColorInput');
  const gradientColor1Input = panel.querySelector('#gradientColor1Input');
  const gradientColor2Input = panel.querySelector('#gradientColor2Input');
  const pSelect = panel.querySelector('#pSelect');
  const wispInput = panel.querySelector('#wispInput');
  const bareInput = panel.querySelector('#bareInput');
  if (taskbarFullCheckbox) {
    localStorage.setItem('nebuli-taskbar-full', taskbarFullCheckbox.checked ? 'true' : 'false');
  }
  if (taskbarCollapseCheckbox) {
    localStorage.setItem('nebuli-taskbar-collapse', taskbarCollapseCheckbox.checked ? 'true' : 'false');
  }
  if (taskbarPositionSelect) {
    localStorage.setItem('nebuli-taskbar-position', taskbarPositionSelect.value);
  }
  if (appearanceTypeSelect) {
    localStorage.setItem('nebuli-taskbar-appearance-type', appearanceTypeSelect.value);
  }
  if (solidColorInput) {
    localStorage.setItem('nebuli-taskbar-solid-color', solidColorInput.value);
  }
  if (gradientColor1Input) {
    localStorage.setItem('nebuli-taskbar-gradient-color1', gradientColor1Input.value);
  }
  if (gradientColor2Input) {
    localStorage.setItem('nebuli-taskbar-gradient-color2', gradientColor2Input.value);
  }
  if (pSelect) {
    localStorage.setItem('nebuli-p', pSelect.value);
  }
  if (wispInput) {
    localStorage.setItem('wisp', wispInput.value);
  }
  if (bareInput) {
    localStorage.setItem('bare', bareInput.value);
  }

  toggleAppearanceInputs(panel);
  applyTaskbarSettings();
}

function collapseTaskbar() {
  if (taskbarCollapsed) return;
  taskbarCollapsed = true;
  taskbar.style.opacity = '0';
  taskbar.style.pointerEvents = 'none';
  
  const isFull = localStorage.getItem('nebuli-taskbar-full') === 'true';
  const position = localStorage.getItem('nebuli-taskbar-position') || DEFAULT_POSITION;
  
  taskbarCollapsedHint.style.display = 'block';
  
  if (isFull) {
    if (position === 'bottom') {
      taskbarCollapsedHint.className = 'collapsed-full-bottom';
    } else if (position === 'top') {
      taskbarCollapsedHint.className = 'collapsed-full-top';
    } else if (position === 'left') {
      taskbarCollapsedHint.className = 'collapsed-full-left';
    } else if (position === 'right') {
      taskbarCollapsedHint.className = 'collapsed-full-right';
    }
  } else {
    if (position === 'bottom') {
      taskbarCollapsedHint.className = 'collapsed-bottom';
    } else if (position === 'top') {
      taskbarCollapsedHint.className = 'collapsed-top';
    } else if (position === 'left') {
      taskbarCollapsedHint.className = 'collapsed-left';
    } else if (position === 'right') {
      taskbarCollapsedHint.className = 'collapsed-right';
    }
  }
}

function expandTaskbar() {
  if (!taskbarCollapsed) return;
  taskbarCollapsed = false;
  taskbar.style.opacity = '1';
  taskbar.style.pointerEvents = 'auto';
  taskbarCollapsedHint.style.display = 'none';
  
  if (taskbarCollapseTimeout) {
    clearTimeout(taskbarCollapseTimeout);
  }
}

function scheduleTaskbarCollapse() {
  if (!localStorage.getItem('nebuli-taskbar-collapse') || localStorage.getItem('nebuli-taskbar-collapse') !== 'true') {
    return;
  }
  
  if (taskbarCollapseTimeout) {
    clearTimeout(taskbarCollapseTimeout);
  }
  
  taskbarCollapseTimeout = setTimeout(() => {
    collapseTaskbar();
  }, 2000);
}

function setupTaskbarCollapseListeners() {
  const isCollapseEnabled = localStorage.getItem('nebuli-taskbar-collapse') === 'true';
  
  if (isCollapseEnabled) {
    taskbar.addEventListener('mouseenter', expandTaskbar);
    taskbar.addEventListener('mouseleave', scheduleTaskbarCollapse);
    taskbarCollapsedHint.addEventListener('mouseenter', expandTaskbar);
    taskbarCollapsedHint.addEventListener('mouseleave', scheduleTaskbarCollapse);
  }
}

function removeTaskbarCollapseListeners() {
  taskbar.removeEventListener('mouseenter', expandTaskbar);
  taskbar.removeEventListener('mouseleave', scheduleTaskbarCollapse);
  taskbarCollapsedHint.removeEventListener('mouseenter', expandTaskbar);
  taskbarCollapsedHint.removeEventListener('mouseleave', scheduleTaskbarCollapse);
}

function applyTaskbarSettings() {
  if (!taskbar) return;
  const position = localStorage.getItem('nebuli-taskbar-position') || DEFAULT_POSITION;
  const isFull = localStorage.getItem('nebuli-taskbar-full') === 'true';
  const appearanceType = localStorage.getItem('nebuli-taskbar-appearance-type') || DEFAULT_APPEARANCE_TYPE;
  const solidColor = localStorage.getItem('nebuli-taskbar-solid-color') || DEFAULT_SOLID_COLOR;
  const color1 = localStorage.getItem('nebuli-taskbar-gradient-color1') || DEFAULT_GRADIENT_COLOR1;
  const color2 = localStorage.getItem('nebuli-taskbar-gradient-color2') || DEFAULT_GRADIENT_COLOR2;

  POSITIONS.forEach(p => taskbar.classList.remove(`pos-${p}`));
  taskbar.classList.add(`pos-${position}`);
  taskbar.classList.toggle('taskbar-full', isFull);

  ['glassy', 'solid', 'gradient'].forEach(a => taskbar.classList.remove(`appearance-${a}`));
  taskbar.classList.add(`appearance-${appearanceType}`);

  taskbar.style.background = '';
  if (appearanceType === 'solid') {
    taskbar.style.background = solidColor;
  } else if (appearanceType === 'gradient') {
    taskbar.style.background = `linear-gradient(45deg, ${color1}, ${color2})`;
  }

  if (isFull) {
    if (position === 'left' || position === 'right') {
      taskbar.style.top = '0';
      taskbar.style.bottom = '0';
      taskbar.style.height = '100vh';
      taskbar.style.width = getComputedStyle(document.documentElement).getPropertyValue('--taskbar-h') || '48px';
      taskbar.style.left = position === 'left' ? '0' : '';
      taskbar.style.right = position === 'right' ? '0' : '';
      taskbar.style.transform = 'none';
    } else if (position === 'top' || position === 'bottom') {
      taskbar.style.left = '0';
      taskbar.style.right = '0';
      taskbar.style.width = '100vw';
      taskbar.style.height = getComputedStyle(document.documentElement).getPropertyValue('--taskbar-h') || '48px';
      taskbar.style.top = position === 'top' ? '0' : '';
      taskbar.style.bottom = position === 'bottom' ? '0' : '';
      taskbar.style.transform = 'none';
    }
  } else {
    taskbar.style.top = '';
    taskbar.style.bottom = '';
    taskbar.style.height = '';
    taskbar.style.width = '';
    taskbar.style.left = '';
    taskbar.style.right = '';
    taskbar.style.transform = '';
  }
  
  removeTaskbarCollapseListeners();
  setupTaskbarCollapseListeners();
  expandTaskbar();
}

function setupSettingsBindings(panel) {
  loadAllSettings(panel);
  const resetBtn = panel.querySelector('#resetAllSettingsBtn');
  const taskbarFullCheckbox = panel.querySelector('#taskbarFullCheckbox');
  const taskbarCollapseCheckbox = panel.querySelector('#taskbarCollapseCheckbox');
  const taskbarPositionSelect = panel.querySelector('#taskbarPositionSelect');
  const appearanceTypeSelect = panel.querySelector('#appearanceTypeSelect');
  const solidColorInput = panel.querySelector('#solidColorInput');
  const gradientColor1Input = panel.querySelector('#gradientColor1Input');
  const gradientColor2Input = panel.querySelector('#gradientColor2Input');
  const pSelect = panel.querySelector('#pSelect');
  const wispInput = panel.querySelector('#wispInput');
  const bareInput = panel.querySelector('#bareInput');
  const addAppBtn = panel.querySelector('#addAppBtn');
  const appUrlInput = panel.querySelector('#appUrlInput');
  const appTitleInput = panel.querySelector('#appTitleInput');

  if (taskbarFullCheckbox) taskbarFullCheckbox.addEventListener('change', () => saveAllSettings(panel));
  if (taskbarCollapseCheckbox) taskbarCollapseCheckbox.addEventListener('change', () => saveAllSettings(panel));
  if (taskbarPositionSelect) taskbarPositionSelect.addEventListener('change', () => saveAllSettings(panel));
  if (appearanceTypeSelect) appearanceTypeSelect.addEventListener('change', () => saveAllSettings(panel));
  if (solidColorInput) solidColorInput.addEventListener('input', () => saveAllSettings(panel));
  if (gradientColor1Input) gradientColor1Input.addEventListener('input', () => saveAllSettings(panel));
  if (gradientColor2Input) gradientColor2Input.addEventListener('input', () => saveAllSettings(panel));
  if (pSelect) pSelect.addEventListener('change', () => saveAllSettings(panel));
  if (wispInput) wispInput.addEventListener('input', () => saveAllSettings(panel));
  if (bareInput) bareInput.addEventListener('input', () => saveAllSettings(panel));

  if (addAppBtn) {
    addAppBtn.addEventListener('click', () => {
      const url = appUrlInput.value.trim();
      const title = appTitleInput.value.trim();
      
      if (!url || !title) {
        alert('Please fill in both URL and title');
        return;
      }

      const success = addStoredCustomApp(url, title);
      if (success) {
        appUrlInput.value = '';
        appTitleInput.value = '';
        loadCustomApps(panel);
        renderCustomAppButtons();
      } else {
        alert('Invalid URL');
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem('nebuli-taskbar-full');
      localStorage.removeItem('nebuli-taskbar-collapse');
      localStorage.removeItem('nebuli-taskbar-position');
      localStorage.removeItem('nebuli-taskbar-appearance-type');
      localStorage.removeItem('nebuli-taskbar-solid-color');
      localStorage.removeItem('nebuli-taskbar-gradient-color1');
      localStorage.removeItem('nebuli-taskbar-gradient-color2');
      localStorage.removeItem('nebuli-p');
      localStorage.removeItem('wisp');
      localStorage.removeItem('bare');

      loadAllSettings(panel);
      saveAllSettings(panel);
    });
  }

  const settingsPills = panel.querySelectorAll('.settings-pill');
  const sectionContents = panel.querySelectorAll('[data-section-content]');

  settingsPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const section = pill.getAttribute('data-section');
      
      settingsPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      
      sectionContents.forEach(content => content.style.display = 'none');
      const activeContent = panel.querySelector(`[data-section-content="${section}"]`);
      if (activeContent) {
        activeContent.style.display = 'block';
      }
    });
  });

  applyTaskbarSettings();
}

function openSettingsInOmnibox(forceNewTab = false) {
  const existingTab = [...tabs.querySelectorAll('.tab')].find(t => {
    const history = histories[t.dataset.id];
    return history && history.showUrl === 'nebuli://settings';
  });
  const settingsIconUrl = document.querySelector('#taskbarSettingsBtn img').src;

  if (existingTab && !forceNewTab) {
    activateTab(existingTab.dataset.id);
  } else {
    addTab('nebuli://settings', 'Settings', 'nebuli://settings', settingsIconUrl);
  }

  wrapper.style.display = 'flex';
  wrapper.classList.remove('fullscreen');
  wrapper.classList.remove('immersive-fullscreen');
  applyRestoredStyles();
  minimizeBubble.style.display = 'none';

  if (fullscreenIcon) {
    fullscreenIcon.src = 'https://assets.nebulilabs.xyz/NebuliOS/fullscreen.png';
    fullscreenBtn.title = 'Toggle Fullscreen';
  }
  trafficMax.title = 'Maximize/Restore Omnibox';
}

if (taskbarSettingsBtn) {
  taskbarSettingsBtn.addEventListener('click', e => {
    e.stopPropagation();
    openSettingsInOmnibox();
  });
}

applyTaskbarSettings();
renderCustomAppButtons();

function handleFirstOpen() {
  const isOpenedOnce = localStorage.getItem('opened-once');
  if (isOpenedOnce !== 'true') {
    const setupIconUrl = getTaskbarIconForInternal('/setup.html');
    addTab('/setup.html', 'Setup', 'nebuli://setup', setupIconUrl);
    wrapper.style.display = 'flex';
  }
}

window.addEventListener('load', handleFirstOpen);

window.addEventListener('message', event => {
  if (event.data && event.data.action === 'close-embed') {
    const setupTab = [...tabs.querySelectorAll('.tab')].find(t => {
      const history = histories[t.dataset.id];
      return history && history.stack.includes('/setup.html');
    });

    if (setupTab) {
      closeTab(setupTab.dataset.id);
    }

    localStorage.setItem('opened-once', 'true');

    if ([...tabs.querySelectorAll('.tab')].length === 0) {
      wrapper.style.display = 'none';
      minimizeBubble.style.display = 'none';
    }
  }
});

function initializeDefaults() {
  if (!localStorage.getItem('wisp')) {
    localStorage.setItem('wisp', DEFAULT_WISP);
  }
  if (!localStorage.getItem('bare')) {
    localStorage.setItem('bare', DEFAULT_BARE);
  }
  if (!localStorage.getItem('nebuli-p')) {
    localStorage.setItem('nebuli-p', DEFAULT_p);
  }
}

function showShortcutsPopup() {
  const popupContent = document.createElement('div');
  popupContent.id = 'shortcutsPopupContent';
  popupContent.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 24px;
    border-radius: 12px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 10px 30px rgba(0, 0, 0, 0.7);
    z-index: 10000;
    max-width: 420px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.3);
  `;
  
  const title = document.createElement('h2');
  title.textContent = 'Keyboard Shortcuts';
  title.style.cssText = `
    margin: 0 0 20px 0;
    font-size: 22px;
    color: #fff;
    font-weight: 600;
    letter-spacing: 0.02em;
  `;
  
  const shortcutsContainer = document.createElement('div');
  shortcutsContainer.style.cssText = `
    font-size: 15px;
    color: rgba(255, 255, 255, 0.8);
    line-height: 2;
  `;
  
  const shortcuts = [
    { key: 'Alt + T', desc: 'New Tab' },
    { key: 'Alt + W', desc: 'Close Current Tab' },
    { key: 'Alt + N', desc: 'Open New Window' },
    { key: 'Alt + ?', desc: 'Show Shortcuts' }
  ];
  shortcuts.forEach(sc => {
    const shortcutItem = document.createElement('div');
    shortcutItem.style.cssText = `
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    const keySpan = document.createElement('span');
    keySpan.textContent = sc.key;
    keySpan.style.cssText = `
      font-weight: 600;
      color: #fff;
      font-family: 'Courier New', monospace;
    `;
    
    const descSpan = document.createElement('span');
    descSpan.textContent = sc.desc;
    descSpan.style.cssText = `
      color: rgba(255, 255, 255, 0.6);
    `;
    
    shortcutItem.appendChild(keySpan);
    shortcutItem.appendChild(descSpan);
    shortcutsContainer.appendChild(shortcutItem);
  });
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `
    margin-top: 20px;
    padding: 10px 16px;
    background: rgba(0, 122, 255, 0.8);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 15px;
    width: 100%;
    font-weight: 500;
    transition: background 0.2s ease;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  `;
  
  closeBtn.addEventListener('mouseover', () => {
    closeBtn.style.background = 'rgba(0, 122, 255, 1)';
  });
  
  closeBtn.addEventListener('mouseout', () => {
    closeBtn.style.background = 'rgba(0, 122, 255, 0.8)';
  });
  
  popupContent.appendChild(title);
  popupContent.appendChild(shortcutsContainer);
  popupContent.appendChild(closeBtn);
  
  const overlay = document.createElement('div');
  overlay.id = 'shortcutsOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  `;
  
  const container = document.createElement('div');
  container.id = 'shortcutsPopupContainer';
  container.appendChild(overlay);
  container.appendChild(popupContent);
  document.body.appendChild(container);
  
  const closePopup = () => {
    container.remove();
  };
  
  closeBtn.addEventListener('click', closePopup);
  overlay.addEventListener('click', closePopup);
  
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closePopup();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  
  document.addEventListener('keydown', escapeHandler);
}

document.addEventListener('keydown', (e) => {
  if (e.altKey) {
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      const iconUrl = document.querySelector('#browserBtn img').src;
      addTab('/search.html', 'New Tab', 'nebuli://search', iconUrl);
      const computed = getComputedStyle(wrapper).display;
      if (computed === 'none') {
        wrapper.style.display = 'flex';
        minimizeBubble.style.display = 'none';
      }
    }
    else if (e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      const activeTab = document.querySelector('.tab.active');
      if (activeTab) {
        const id = activeTab.dataset.id;
        closeTab(id);
      }
    }
    else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      const computed = getComputedStyle(wrapper).display;
      if (computed === 'none') {
        const iconUrl = document.querySelector('#browserBtn img').src;
        addTab('/search.html', 'New Tab', 'nebuli://search', iconUrl);
        wrapper.style.display = 'flex';
        minimizeBubble.style.display = 'none';
      }
    }
    else if (e.key === '?') {
      e.preventDefault();
      showShortcutsPopup();
    }
  }
});
