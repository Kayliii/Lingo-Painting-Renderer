/* eslint-global meshLibs */

function getCells (tscn) {
  const match = tscn.match(/"cells": PoolIntArray\((.*?)\)/)
  if (!match) return null

  const nums = match[1].split(',').map(Number)
  const result = []
  for (let i=0;i<nums.length; i+=3) {

    const y = nums[i] >> 16
    const x = new Int16Array([nums[i] & 0xFFFF])[0]
    const col = nums[i+2] & 0xFFFF

    result.push([x,y,col])
  }
  return normalizeCoords(result)
}

function normalizeCoords(cells) {
  let minX = Infinity
  let minY = Infinity
  cells.forEach(([x,y]) => {
    minX = Math.min(minX,x)
    minY = Math.min(minY,y)
  })
  return cells.map(([x,y,col])=>[x-minX, y-minY, col])
}

function getMeshLib(tscn) {
  const match = tscn.match(/path="([^"]*?).meshlib" type="MeshLibrary"/)
  if (!match) return null

  const match2 = match[1].match(/(?:\/|^)([^/]*)$/)
  if(!match2) return null
  return meshLibs[match2[1]] ?? null
}

/** Use after normalization */
function getSize(cells) {
  let maxX = 0
  let maxY = 0
  cells.forEach(([x,y]) => {
    maxX = Math.max(maxX,x)
    maxY = Math.max(maxY,y)
  })
  return [maxX+1, maxY+1]
}

function makePaintingCanvas(cells, meshLib, pixelScale = 10) {
  const [w,h] = getSize(cells)
  const canvas = document.createElement('canvas')
  canvas.width = w * pixelScale
  canvas.height = h * pixelScale

  const ctx = canvas.getContext('2d')

  for (const [x, y, colId] of cells) {
    const [r,g,b,a] = meshLib[colId]
    ctx.fillStyle = `rgb(${r} ${g} ${b} / ${(a / 256).toFixed(2)})`
    ctx.fillRect(x*pixelScale, h*pixelScale-(y+1)*pixelScale, pixelScale, pixelScale);
  }

  return canvas
}

function getCanvasWrapper (fileName, canvas) {
  const div = document.createElement('div')
  div.append(canvas)

  const lbl = document.createElement('div')
  lbl.className = 'canvas-label'
  lbl.textContent = fileName
  div.append(lbl)

  return div
}

async function parseFile(file) {
  const name = file.name
  const text = await file.text()
  const meshLib = getMeshLib(text)
  const cells = getCells(text)

  return { name, meshLib, cells }
}

/*async function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsText(file, 'UTF-8')
    reader.onload = evt => resolve(evt.target.result)
    reader.onerror = err => reject(err)
  })
}*/

//let loadedPaintings = []

const fileInput = document.getElementById('paintings')
const gallery = document.getElementById('gallery')
const range = document.getElementById('range')
const rangeValue = document.getElementById('range-value')

let updateCnt = 0

async function updatePaintings() {
  const updateIndex = ++updateCnt
  const scale = range.value
  rangeValue.textContent = `x${scale}`
  document.body.style.setProperty('--scale', scale)
  gallery.innerHTML = ''
  for (const file of fileInput.files) {
    let elem
    try {
      const { name, meshLib, cells } = await parseFile(file)
      const canvas = makePaintingCanvas(cells, meshLib, scale)
      elem = getCanvasWrapper(name, canvas)
    } catch (e) {
      elem = document.createElement('div')
      elem.className = 'error'
      elem.textContent = `No preview could be generated for ${file.name}.`
    }
    if (updateCnt === updateIndex) gallery.append(elem)
  }
}

fileInput.addEventListener('change', () => updatePaintings())
range.addEventListener('input', () => updatePaintings())