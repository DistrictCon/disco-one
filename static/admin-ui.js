
;(() => {
    const $ = (q) => Array.from(document.querySelectorAll(q))
    
    $('.validate-scores')[0].addEventListener('click', async () => {
        const resp = await fetch('/admin/validate')
        if (resp.status !== 200) {
            $('.messages')[0].innerHTML += `<p class='message'>Error while validating scores: ${resp.status}</p>`
            return
        }
        const counts = await resp.json()
        $('.messages')[0].innerHTML += `<p class='message'>Validated all User scores (${counts.updated} of ${counts.total} modified).</p>`
    })

    $('.edit-user .close')[0].addEventListener('click', () => {
        $('.edit-user')[0].classList.add('hide')
    })

    $('.all-users')[0].addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit')) {
            const data = e.target.parentNode.parentNode.getAttribute('data-user').split('|')
            if (data && data.length === 4) {
                console.log('editing user:', data)
                $('.edit-user')[0].classList.remove('hide')
                $('#user-id')[0].value = data[0]
                $('#username')[0].value = data[1]
                $('#email')[0].value = data[2]
                if (data[3] === 'true') {
                    $('#is-admin')[0].setAttribute('checked', 'checked')
                } else {
                    $('#is-admin')[0].removeAttribute('checked')
                }

                const resp = await fetch('/user/'+data[0])
                if (resp.status !== 200) {
                    $('.edit-user .submissions ul')[0].innerHTML = '<li>Unable to query for user data</li>'
                    return console.warn('Bad response querying user:', resp.status)
                }
                const user = await resp.json()
                const submissions = user.submissions.map(sub => {
                    return `<li data-id='${sub.id}'>${sub.pattern} (${sub.points})</li>`
                })
                $('.edit-user .submissions ul')[0].innerHTML = submissions.join('\n')
            }
        }

        if (e.target.classList.contains('delete')) {
            const row = e.target.parentNode.parentNode
            const data = row.getAttribute('data-user').split('|')
            console.log('DELETING', data)
            if (data && data.length === 4) {
                if (confirm('Are you sure you want to permanently delete this user?\n\nThis will also delete any submissions they have!')) {
                    const resp = await fetch('/user/'+data[0], {
                        method: 'delete'
                    })
                    if (resp.status !== 200) {
                        return console.warn('Bad response deleting user:', resp.status)
                    } else {
                        $('.messages')[0].innerHTML += `<p class='message'>User '${data[1]}' has been deleted!</p>`
                        row.parentNode.removeChild(row)
                    }
                }
            }
        }
    })

    const maxWidth = $('main')[0].clientWidth - 150
    $('.statsByHour .bar.users').forEach(bar => {
        const value = Number(bar.getAttribute('data-value'))
        const w = (value / countChartExtremes.maxUsers) * maxWidth
        bar.setAttribute('style', `width: ${w}px`)
    })
    $('.statsByHour .bar.patterns').forEach(bar => {
        const value = Number(bar.getAttribute('data-value'))
        const w = (value / countChartExtremes.maxPatterns) * maxWidth
        bar.setAttribute('style', `width: ${w}px`)
    })

    let startHour = null
    let holdStartEl = null
    let endHour = null
    $('.statsByHour li').forEach((n) => {
        if (n.classList.contains('zero-stats-row')) {
            if (!startHour) {
                startHour = n.getAttribute('data-hour')
                holdStartEl = n
            }
            const hour = n.getAttribute('data-hour')
            if (hour !== startHour) { endHour = hour }
        } else if (startHour) {
            holdStartEl.classList.add('zero-stats-range')
            holdStartEl.innerHTML = `<h5 class='label'>${startHour} - ${endHour} (0)</h5>`
            startHour = null
            holdStartEl = null
            endHour = null
        }
    })

})();
