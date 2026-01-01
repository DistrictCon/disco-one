
;(async () => {
    const SVG = document.getElementById('display')
    const LIGHT_TIME_UNIT = 500
    const PAUSE_TIME_UNIT = 75
    const LINE_SEGMENT_DELAY = 75

    const MAP_COORDS = setMapLayout()
    const COLOR_MAP = { R:{name:'red'}, G:{name:'green'}, B:{name:'blue'}, O:{name:'orange'}, Y:{name:'yellow'} }
    Object.keys(COLOR_MAP).forEach(c => {
        COLOR_MAP[c].start = MAP_COORDS[c]
    })


    if (window.location.search === '?admin') {
        document.querySelector('.admin').style.display = 'block'
        const patternElem = document.getElementById('pattern')
        const holdElem = document.getElementById('hold')
        // Testing (nearly) all paths and points
        patternElem.value = 'R2-1-3-12-11-21-29-B2-21-12-R-2-4-3-G2-5-6-9-10-8-18-17-O2-14-13-G-B-22-15-16-Y2-20-19-26-27-24-23-25-17-16-9-6-7-14-28'
        document.getElementById('admin-pattern').addEventListener('submit', async (e) => {
            e.preventDefault()
            await parsePattern(patternElem.value, holdElem.checked === true)
            return false
        })
        document.getElementById('clear').addEventListener('click', () => {
            SVG.innerHTML = ''
        })
    }

    

    // TODO: fetch the data we need



    async function parsePattern(pattern, hold=false) {
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

        for (let i=0; i<lines.length; ++i) {
            const elemIDs = await showLine(lines[i].color, lines[i].segments)
            if (!hold) {
                setTimeout(async () => {
                    await disipateLine(elemIDs, lines[i].color, lines[i].pause * PAUSE_TIME_UNIT)
                }, lines[i].duration * LIGHT_TIME_UNIT)
            }
        }

        return lines
    }

    async function showLine(color, points) {
        const elems = []
        elems.push(await pulseSource(color, points[0]))
        for (let i=0; i<points.length-1; ++i) {
            elems.push(await addSegment(color, points[i], points[i+1]))
        }
        return elems
    }
    
    function addSegment(color, start, end) {
        return new Promise((resolve, _) => {
            const segId = `line-${Date.now()}`
            const segment = addElem(`<line id='${segId}' class='${color}' x1='${start[0]}' y1='${start[1]}' x2='${end[0]}' y2='${end[1]}'></line>`)
            setTimeout(() => { resolve(segId) }, LINE_SEGMENT_DELAY)
        })
    }

    function disipateLine(elemIDs, color, delay) {
        return new Promise((resolve, _) => {
            let opacity = 1
            let intHandle = setInterval(() => {
                opacity -= 0.1
                elemIDs.forEach(id => {
                    const el = SVG.getElementById(id)
                    if (el) { el.style.opacity = opacity }
                })
                
                if (opacity < 0.1) {
                    clearInterval(intHandle)
                    intHandle = null
                    elemIDs.forEach(id => {
                        const el = SVG.getElementById(id)
                        if (el) { el.parentNode?.removeChild(el) }
                    })
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
                    resolve(circle.getAttribute('id'))
                }
            }, time)
        }
    }

    function addElem(html, query=null) {
        SVG.innerHTML += html
        if (!query) {
            const id = html.split(' ').filter(a => /id=/.test(a))[0]?.replaceAll(`'`, '')
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
        SVG.style.height = `${h}px`
        const unit = Math.round(w / dim[0])
        
        const pointMap = {}
        pointMap.R = [7 * unit, 1 * unit]
        pointMap.B = [16 * unit, 23 * unit]
        pointMap.G = [16 * unit, 13 * unit]
        pointMap.O = [41 * unit, 9 * unit]
        pointMap.Y = [59 * unit, 23 * unit]

        pointMap[1] = [1 * unit, 1 * unit]
        pointMap[2] = [13 * unit, 1 * unit]
        pointMap[3] = [1 * unit, 5 * unit]
        pointMap[4] = [13 * unit, 5 * unit]
        pointMap[5] = [16 * unit, 8 * unit]
        pointMap[6] = [20 * unit, 8 * unit]
        pointMap[7] = [24 * unit, 8 * unit]
        pointMap[8] = [48 * unit, 11 * unit]
        pointMap[9] = [27 * unit, 13 * unit]
        pointMap[10] = [42 * unit, 13 * unit]
        pointMap[11] = [1 * unit, 16 * unit]
        pointMap[12] = [13 * unit, 16 * unit]
        pointMap[13] = [20 * unit, 17 * unit]
        pointMap[14] = [36 * unit, 17 * unit]
        pointMap[15] = [20 * unit, 20 * unit]
        pointMap[16] = [27 * unit, 20 * unit]
        pointMap[17] = [39 * unit, 20 * unit]
        pointMap[18] = [48 * unit, 20 * unit]
        pointMap[19] = [53 * unit, 19 * unit]
        pointMap[20] = [59 * unit, 19 * unit]
        pointMap[21] = [7 * unit, 23 * unit]
        pointMap[22] = [20 * unit, 23 * unit]
        pointMap[23] = [41 * unit, 23 * unit]
        pointMap[24] = [50 * unit, 22 * unit]
        pointMap[25] = [50 * unit, 24 * unit]
        pointMap[26] = [53 * unit, 26 * unit]
        pointMap[27] = [59 * unit, 26 * unit]
        pointMap[28] = [36 * unit, 8 * unit]
        pointMap[29] = [2 * unit, 23 * unit]
        pointMap[30] = [38 * unit, 17 * unit]

        const walls = [
            [0, 0, 14, 0], [0, 0, 0, 21], [0, 21, 14, 21], [14, 0, 14, 21],
            [14, 7, 39, 7], [39, 7, 39, 18], [14, 18, 39, 18], 
            [43, 10, 52, 10], [52, 10, 52, 21], [52, 21, 43, 21], [43, 21, 43, 10], 
            [52, 18, 60, 18], [60, 18, 60, 27], [60, 27, 52, 27], [52, 27, 52, 21],
            [1, 21, 1, 25], [1, 25, 21, 25], [21, 25, 21, 22],
            [21, 22, 40, 22], [40, 22, 40, 25], [40, 25, 52, 25]
        ]
        walls.forEach(w => {
            addElem(`<line class='wall' x1='${w[0]*unit}' y1='${w[1]*unit}' x2='${w[2]*unit}' y2='${w[3]*unit}'></line>`)
        })

        return pointMap
    }

})();
