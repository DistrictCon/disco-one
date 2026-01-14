
;(async () => {
    const $ = (q) => Array.from(document.querySelectorAll(q))
    const CACHE_ID = 'disco1bc'
    let cache = JSON.parse(localStorage.getItem(CACHE_ID) || '{}')
    
    $('.messages')[0].addEventListener('click', e => {
        if (e.target.classList.contains('message')) {
            e.target.parentNode.removeChild(e.target)
        }
    })

    $('.mode-switch')[0]?.addEventListener('click', async (e) => {
        e.preventDefault()
        const page = $('html')[0]
        let mode = 0
        if (page.classList.contains('light-mode')) {
            page.classList.remove('light-mode')
        } else {
            page.classList.add('light-mode')
            mode = 1
        }
        const message = JSON.stringify({ type: 'mode', username: d.u, data: mode })
        await fetch('/logs', {
            method: 'post',
            body: message,
            headers: { 'Content-length': message.length, 'Content-Type': 'application/json', Authorization: d.k }
        })
        cache.mode = mode
        saveCache()
        return false
    })

    if (cache.mode) {
        $('html')[0].classList.add('light-mode')
    }

    const message = JSON.stringify({ type: 'hit', username: d.u, data: d.p })
    await fetch('/logs', {
        method: 'post',
        body: message,
        headers: { 'Content-length': message.length, 'Content-Type': 'application/json', Authorization: d.k }
    })

    function saveCache() {
        localStorage.setItem(CACHE_ID, JSON.stringify(cache))
    }

})();
