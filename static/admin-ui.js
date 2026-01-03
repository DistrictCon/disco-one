
;(() => {
    const $ = (q) => Array.from(document.querySelectorAll(q))
    
    $('.users')[0].addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit')) {
            const data = e.target.parentNode.parentNode.getAttribute('data-user').split('|')
            if (data && data.length === 3) {
                $('.edit-user')[0].classList.remove('hide')
                $('#user-id')[0].value = data[0]
                $('#username')[0].value = data[1]
                if (data[2] === 'true') {
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
            if (data && data.length === 3) {
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

    

})();
