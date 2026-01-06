
;(() => {
    const $ = (q) => Array.from(document.querySelectorAll(q))
    const CACHE_ID = 'disco1bc'
    let cache = JSON.parse(localStorage.getItem(CACHE_ID) || '{}')
    console.log(cache)
    
    $('.messages')[0].addEventListener('click', e => {
        if (e.target.classList.contains('message')) {
            e.target.parentNode.removeChild(e.target)
        }
    })

    $('.mode-switch')[0]?.addEventListener('click', (e) => {
        e.preventDefault()
        const page = $('html')[0]
        let mode = 0
        if (page.classList.contains('light-mode')) {
            page.classList.remove('light-mode')
        } else {
            page.classList.add('light-mode')
            mode = 1
        }
        cache.mode = mode
        saveCache()
        return false
    })

    if (cache.mode) {
        $('html')[0].classList.add('light-mode')
    }

    function saveCache() {
        localStorage.setItem(CACHE_ID, JSON.stringify(cache))
    }

})();
