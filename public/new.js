function checkFullscreenStatus() {
    if (!document.fullscreenElement) {
        document.getElementById('fullscreen-exit-message').style.display = 'block';
    } else {
        document.getElementById('fullscreen-exit-message').style.display = 'none';
    }
}

