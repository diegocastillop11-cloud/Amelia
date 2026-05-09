'use client'

interface MapEmbedProps {
  lat: number
  lng: number
  height?: number
}

function getMapHtml(lat: number, lng: number) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;height:100%;}</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true,scrollWheelZoom:false}).setView([${lat},${lng}],16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
L.marker([${lat},${lng}]).addTo(map);
</script>
</body>
</html>`
}

export default function MapEmbed({ lat, lng, height = 200 }: MapEmbedProps) {
  return (
    <iframe
      srcDoc={getMapHtml(lat, lng)}
      width="100%"
      height={height}
      style={{ border: 'none', display: 'block' }}
    />
  )
}
