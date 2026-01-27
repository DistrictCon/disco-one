
;(async () => {
    const SVG = document.getElementById('display')
    const MAP_DIMENSIONS = [60, 27]
    const DEFAULT_LIGHT_TIME_UNIT = 500
    let LIGHT_TIME_UNIT = DEFAULT_LIGHT_TIME_UNIT
    const EDGE_FLASH_DURATION = 400
    const PAUSE_TIME_UNIT = 250
    const LINE_SEGMENT_DELAY = 75
    const DISSIPATION_INTERVAL = 50

    const MAP_COORDS = setMapLayout()
    const COLOR_MAP = { R:{name:'red'}, G:{name:'green'}, B:{name:'blue'}, O:{name:'orange'}, Y:{name:'yellow'} }
    const ALL_COLORS = []
    Object.keys(COLOR_MAP).forEach(c => {
        COLOR_MAP[c].start = MAP_COORDS[c]
        ALL_COLORS.push(COLOR_MAP[c].name)
    })

    runNext()

    document.querySelector('.close').addEventListener('click', () => {
        window.close()
    })

    function showMessage(msg) {
        document.querySelector('.message').innerHTML = `<p>${msg}</p>`
    }

    function runNext() {
        if (!window.LASER_PATH) {
            SVG.style.display = 'none'
            return showMessage('No pattern was found!')
        }
        parsePath(window.LASER_PATH, () => {
            showMessage(`Well done, that pattern was worth ${window.PATTERN_POINTS} watts!`)
        })
    }

    async function parsePath(pattern, done=()=>{}) {
        if (!/^[RGBOY]\d\-[RBGOYZE\d\-]+\-(\d+|[RGBOY]|E[RGBOY]\d)$/.test(pattern)) {
            return flashOutline('red', 3, EDGE_FLASH_DURATION, done)
        }

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

        let edgeFlash = null
        if (/-E[RGBOY]\d$/.test(pattern)) {
            edgeFlash = pattern.split('-E')[1].split('')
            edgeFlash[1] = Number(edgeFlash[1])
        }

        for (let i=0; i<lines.length; ++i) {
            await showLine(lines[i])
        }

        if (edgeFlash) {
            flashOutline(COLOR_MAP[edgeFlash[0]].name, edgeFlash[1], EDGE_FLASH_DURATION, () => {
                done(lines)
            })
        } else {
            done(lines)
        }
    }

    async function showLine(line) {
        return new Promise(async (resolve, _) => {
            const elems = []
            elems.push(await pulseSource(line.color, line.segments[0]))
            for (let i=0; i<line.segments.length-1; ++i) {
                elems.push(await addSegment(line.color, line.segments[i], line.segments[i+1]))
            }
            setTimeout(async () => {
                await disipateLine(elems)
                if (line.pause) {
                    setTimeout(() => {
                        resolve()
                    }, line.pause * PAUSE_TIME_UNIT)
                } else {
                    resolve()
                }
            }, line.duration * LIGHT_TIME_UNIT)
        })
    }
    
    function addSegment(color, start, end) {
        return new Promise((resolve, _) => {
            const segId = `line-${Date.now()}`
            addElem(`<line id='${segId}' class='${color}' x1='${start[0]}' y1='${start[1]}' x2='${end[0]}' y2='${end[1]}'></line>`)
            setTimeout(() => { resolve(segId) }, LINE_SEGMENT_DELAY)
        })
    }

    function disipateLine(elemIDs) {
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
            }, DISSIPATION_INTERVAL)
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

    function flashOutline(color='red', count=1, pulse=500, done=()=>{}) {
        const edges = Array.from(SVG.querySelectorAll('line.edge'))
        edges.forEach(n => {
            n.classList.remove(...ALL_COLORS)
            n.classList.add(color)
        })

        let opacity = 0
        let change = 0.05
        let intHandle = setInterval(() => {
            opacity += change
            edges.forEach(n => n.style.opacity = opacity )
            
            if (opacity > 0.94) {
                change = change * (-1)
            } else if (opacity < 0.05) {
                count--
                change = change * (-1)
            }
            if (count < 1) {
                clearInterval(intHandle)
                intHandle = null
                done()
            }
        }, pulse / (1 / change))
    }

    function setMapLayout() {
        const w = SVG.clientWidth
        const h = Math.round(w / (MAP_DIMENSIONS[0] / MAP_DIMENSIONS[1])) + 10
        SVG.style.height = `${h}px`
        const unit = Math.round(w / MAP_DIMENSIONS[0])
        
        const pointMap = {}
        pointMap.R = [7 * unit, 1 * unit]
        pointMap.B = [16 * unit, 23 * unit]
        pointMap.G = [16 * unit, 13 * unit]
        pointMap.O = [41 * unit, 9 * unit]
        pointMap.Y = [59 * unit, 23 * unit]

        pointMap[1] = [1 * unit, 1 * unit]
        pointMap[2] = [13 * unit, 1 * unit]
        pointMap[3] = [1 * unit, 6 * unit]
        pointMap[4] = [13 * unit, 6 * unit]
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
        pointMap[31] = [27 * unit, 23 * unit]

        const walls = [
            [0.25, 0.5, 14, 0.5], [0.25, 0.5, 0.25, 21], [0.25, 21, 14, 21], [14, 0.5, 14, 21],
            [14, 7, 39, 7], [39, 7, 39, 18], [14, 18, 39, 18], 
            [43, 10, 52, 10], [52, 10, 52, 21], [52, 21, 43, 21], [43, 21, 43, 10], 
            [52, 18, 60, 18], [60, 18, 60, 27], [60, 27, 52, 27], [52, 27, 52, 21],
            [1, 21, 1, 25], [1, 25, 21, 25], [21, 25, 21, 22],
            [21, 22, 40, 22], [40, 22, 40, 25], [40, 25, 52, 25]
        ]
        walls.forEach(w => {
            addElem(`<line class='wall' x1='${w[0]*unit}' y1='${w[1]*unit}' x2='${w[2]*unit}' y2='${w[3]*unit}'></line>`)
        })

        addElem(`<line class='edge' x1='2' y1='2' x2='${w-2}' y2='2'></line>`)
        addElem(`<line class='edge' x1='${w-2}' y1='2' x2='${w-2}' y2='${h-2}'></line>`)
        addElem(`<line class='edge' x1='${w-2}' y1='${h-2}' x2='2' y2='${h-2}'></line>`)
        addElem(`<line class='edge' x1='2' y1='${h-2}' x2='2' y2='2'></line>`)

        return pointMap
    }

})();
