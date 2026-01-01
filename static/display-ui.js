
;(async () => {
    const SVG = document.getElementById('display')
    const LIGHT_TIME_UNIT = 500
    const PAUSE_TIME_UNIT = 75

    const MAP_COORDS = setMapLayout()
    const COLOR_MAP = {
        R: {name: 'red'},
        G: {name: 'green'},
        B: {name: 'blue'},
        O: {name: 'orange'},
        Y: {name: 'yellow'}
    }
    Object.keys(COLOR_MAP).forEach(c => {
        COLOR_MAP[c].start = MAP_COORDS[c]
    })

    // TODO: draw venue walls
    

    // TODO: fetch the data we need
    const lines = parsePattern('G2-9-16-18-8-10-O-Z1-O2-14-7')
    console.log(lines)

    for (let i=0; i<lines.length; ++i) {
        await showLine(lines[i].color, lines[i].segments)
        setTimeout(async () => {
            disipateLine(lines[i].color, lines[i].pause * PAUSE_TIME_UNIT)
        }, lines[i].duration * LIGHT_TIME_UNIT)
    }


    function parsePattern(pattern) {
        const lines = []
        let curr = null
        pattern.split('-').forEach(n => {
            if (/^[RGBOY][0-9]$/.test(n)) {
                if (curr) { lines.push(curr) }
                curr = {
                    color: COLOR_MAP[n.split('')[0]].name,
                    duration: Number(n.split('')[1]),
                    segments: [COLOR_MAP[n.split('')[0]].start],
                    pause: 0
                }
            } else if (/^Z[0-9]$/.test(n)) {
                curr.pause = Number(n.split('')[1])
            } else if (/^[RGBOY]$/.test(n)) {
                curr.segments.push(MAP_COORDS[n])
            } else if (Number(n)) {
                curr.segments.push(MAP_COORDS[Number(n)])
            }
        })
        if (curr) { lines.push(curr) }
        return lines
    }

    async function showLine(color, points) {
        await pulseSource(color, points[0])
        for (let i=0; i<points.length-1; ++i) {
            await addSegment(color, points[i], points[i+1])
        }
    }
    
    function addSegment(color, start, end) {
        return new Promise((resolve, _) => {
            addElem(`<line id='line-${Date.now()}' class='${color}' x1='${start[0]}' y1='${start[1]}' x2='${end[0]}' y2='${end[1]}'></line>`)
            setTimeout(() => { resolve() }, 75)
        })
    }

    function disipateLine(color, delay) {
        return new Promise((resolve, _) => {
            const elems = Array.from(SVG.querySelectorAll(`line.${color}, circle.${color}`))
            let opacity = 1
            let intHandle = setInterval(() => {
                opacity -= 0.1
                elems.forEach(e => e.style.opacity = opacity)
                if (opacity <= 0) {
                    clearInterval(intHandle)
                    intHandle = null
                    elems.forEach(e => SVG.removeChild(e))
                    resolve()
                }
            }, delay || 40)
        })
    }

    function pulseSource(color, loc) {
        return new Promise((resolve, _) => {
            const circle = addElem(`<circle id='source-${Date.now()}' class='${color}' cx='${loc[0]}' cy='${loc[1]}' r='1'></circle>`)
            incrementRadius(200, 1, circle, resolve)
        })

        function incrementRadius(time, radius, circle, resolve) {
            setTimeout(() => {
                circle.setAttribute('r', ++radius)
                if (radius < 10) {
                    time -= (radius * Math.floor((Math.random() * 5) + 8))
                    incrementRadius(time, radius, circle, resolve)
                } else {
                    resolve()
                }
            }, time)
        }
    }

    function addElem(html, query=null) {
        SVG.innerHTML += html
        if (!query) {
            const id = html.split(' ').filter(a => /id=/.test(a))[0].replaceAll(`'`, '')
            if (id) {
                query = '#' + id.split('=')[1]
            } else {
                query = html.substring(1).split(' ')[0]
            }
        }
        return SVG.querySelector(query)
    }

    function setMapLayout() {
        const dim = [60, 27]  // map is 60 units widw x 27 units tall
        const w = SVG.clientWidth
        const h = Math.round(w / (dim[0] / dim[1]))
        const unit = Math.round(w / dim[0])
        
        const pointMap = {}
        pointMap.R = [7 * unit, 1 * unit]
        pointMap.B = [16 * unit, 23 * unit]
        pointMap.G = [16 * unit, 13 * unit]
        pointMap.O = [41 * unit, 9 * unit]
        pointMap.Y = [59 * unit, 23 * unit]

        pointMap[7] = [24 * unit, 8 * unit]
        pointMap[8] = [48 * unit, 10 * unit]
        pointMap[9] = [27 * unit, 13 * unit]
        pointMap[10] = [43 * unit, 12 * unit]
        pointMap[14] = [36 * unit, 17 * unit]
        pointMap[16] = [27 * unit, 20 * unit]
        pointMap[18] = [48 * unit, 20 * unit]

        return pointMap
    }


})();
