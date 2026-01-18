
;(async () => {
    const $ = (q) => Array.from(document.querySelectorAll(q))
    const CACHE_ID = 'disco1bc'
    let cache = JSON.parse(localStorage.getItem(CACHE_ID) || '{}')
    const lumi = $('img.lumi')[0]
    
    function setupUIEvents() {
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
            await sendLog('mode', mode)
            cache.mode = mode
            saveCache()
            return false
        })

        if (lumi) { setTimeout(randomLumi, Math.ceil(Math.random() * 7000) + 2000) }
    }

    function randomLumi() {
        if (!lumi) { return }
        const curr = lumi.getAttribute('src')
        const faces = ['mouth-closed', 'mouth-open', 'tongue-out']
            .filter(f => { return !(new RegExp(f)).test(curr) })
        const next = Math.floor(Math.random() * faces.length)
        lumi.setAttribute('src', `/images/lumi-${faces[next]}.png`)
        setTimeout(randomLumi, Math.ceil(Math.random() * 8000) + 3000)
    }

    async function sendLog(type, data) {
        if (!d.k) { return }
        const message = JSON.stringify({ type, username: d.u, data })
        await fetch('/logs', {
            method: 'post',
            body: message,
            headers: { 'Content-length': message.length, 'Content-Type': 'application/json', Authorization: d.k }
        })
    }

    function saveCache() {
        localStorage.setItem(CACHE_ID, JSON.stringify(cache))
    }

    $('.last-submission .hint').forEach(n => {
        const link = n.innerHTML.match(/(https:\/\/[^ "\n]+)/)
        if (link) {
            n.innerHTML = n.innerHTML.replace(link[1], `<a href='${link[1]}' target='_blank'>${link[1]}</a>`)
        }
    })

    if (cache.mode) {
        $('html')[0].classList.add('light-mode')
    }
    setupUIEvents()
    await sendLog('hit', d.p)
})();
