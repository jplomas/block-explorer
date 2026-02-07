import { homechart } from '/imports/api/index.js'
import { Tracker } from 'meteor/tracker'

import './home.html'
import '../../components/status/status.js'
/* global LocalStore */

let chartIntervalHandle
let currentChart = null
let isChartInitialized = false
let userHasInteracted = false
let lastDataLength = 0
let currentViewRange = { min: 0, max: 0 }
let lastProcessedData = null

// Load ApexCharts from CDN with pinned version and SRI
function loadApexCharts() {
  return new Promise((resolve, reject) => {
    if (window.ApexCharts) {
      resolve(window.ApexCharts)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/apexcharts@3.44.0/dist/apexcharts.min.js'
    script.integrity = 'sha384-S+z6GyrrYmfdZiLuK+I0tCaabgSR/FH/+NIE3Xgu9W9UL0sFgPzGgoXVfwBeviXD'
    script.crossOrigin = 'anonymous'
    script.onload = () => {
      resolve(window.ApexCharts)
    }
    script.onerror = () => {
      console.error('Failed to load ApexCharts')
      reject(new Error('Failed to load ApexCharts'))
    }
    document.head.appendChild(script)
  })
}

// Calculate nice increments divisible by 10
function calculateNiceIncrement(maxValue, minValue, targetTicks = 8) {
  const range = maxValue - minValue
  const roughStep = range / targetTicks

  // Find the order of magnitude
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))

  // Normalize the rough step
  const normalizedStep = roughStep / magnitude

  // Choose a nice step that's divisible by 10
  let niceStep
  if (normalizedStep <= 1) niceStep = 1
  else if (normalizedStep <= 2) niceStep = 2
  else if (normalizedStep <= 5) niceStep = 5
  else niceStep = 10

  return niceStep * magnitude
}

// Initialize the chart with initial data
async function initializeChart(dataToUse, isSampleData = false) {
  const isDark = LocalStore.get('theme') !== 'light'
  const chartContainer = document.getElementById('chart-container')

  if (!chartContainer) {
    return
  }

  try {
    // Guard against empty data
    if (!dataToUse.labels || dataToUse.labels.length === 0) {
      return
    }

    // Clear any existing chart
    chartContainer.innerHTML = ''

    // Load ApexCharts
    const ApexCharts = await loadApexCharts()

    // Transform data for ApexCharts — only include data points that have matching labels
    const labelCount = dataToUse.labels.length
    const series = dataToUse.datasets.map((dataset) => ({
      name: dataset.label,
      data: dataset.data.slice(0, labelCount).map((value, index) => ({
        x: dataToUse.labels[index],
        y: value,
      })),
    }))

    // Start with the most zoomed out view - show all available data
    const maxBlock = Math.max(...dataToUse.labels)
    const minBlock = Math.min(...dataToUse.labels)
    currentViewRange = { min: minBlock, max: maxBlock }

    // Calculate nice increments divisible by 10
    const niceIncrement = calculateNiceIncrement(currentViewRange.max, currentViewRange.min)

    // ApexCharts configuration for real-time updates
    const options = {
      chart: {
        type: 'line',
        height: 320,
        background: 'transparent',
        toolbar: {
          show: false,
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350,
          },
        },
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
        events: {
          zoom(chartContext, { xaxis }) {
            userHasInteracted = true
            currentViewRange = {
              min: xaxis.min,
              max: xaxis.max,
            }
          },
          pan(chartContext, { xaxis }) {
            userHasInteracted = true
            currentViewRange = {
              min: xaxis.min,
              max: xaxis.max,
            }
          },
          selection(chartContext, { xaxis }) {
            userHasInteracted = true
            currentViewRange = {
              min: xaxis.min,
              max: xaxis.max,
            }
          },
        },
      },
      theme: {
        mode: isDark ? 'dark' : 'light',
      },
      series,
      colors: ['#4AAFFF', '#9CA3AF', '#8B5A0F', '#FFA729'],
      stroke: {
        curve: 'smooth',
        width: [3, 3, 3, 1],
      },
      grid: {
        show: true,
        borderColor: isDark ? 'rgba(234, 239, 245, 0.1)' : 'rgba(11, 24, 30, 0.1)',
      },
      xaxis: {
        type: 'numeric',
        min: currentViewRange.min,
        max: currentViewRange.max,
        title: {
          text: 'Block Number',
          style: {
            color: isDark ? '#EAEFF5' : '#0B181E',
            fontSize: '12px',
            fontWeight: 600,
          },
        },
        labels: {
          style: {
            colors: isDark ? '#EAEFF5' : '#0B181E',
            fontSize: '12px',
            fontWeight: 500,
          },
          formatter(value) {
            const roundedValue = Math.round(value)
            if (roundedValue % 5 === 0) {
              return roundedValue.toLocaleString()
            }
            return ''
          },
          rotate: 0,
          trim: false,
          hideOverlappingLabels: false,
        },
        tickAmount: 12,
        tickPlacement: 'between',
        forceNiceScale: true,
      },
      yaxis: [
        {
          // Left Y-axis for Hash Power (series index 0)
          seriesName: 'Hash Power (hps)',
          title: {
            text: 'Hash Power / Difficulty',
            style: {
              color: isDark ? '#EAEFF5' : '#0B181E',
              fontSize: '12px',
              fontWeight: 600,
            },
          },
          labels: {
            style: {
              colors: isDark ? '#EAEFF5' : '#0B181E',
              fontSize: '11px',
            },
            formatter(value) {
              return value.toLocaleString()
            },
          },
        },
        {
          // Left Y-axis for Difficulty (series index 1) — shares axis with Hash Power
          seriesName: 'Difficulty',
          show: false,
          labels: {
            formatter(value) {
              return value.toLocaleString()
            },
          },
        },
        {
          // Right Y-axis for Block Time (series index 2) — shares axis with Block Time Average
          seriesName: 'Block Time (s)',
          opposite: true,
          show: false,
          min: 0,
          labels: {
            formatter(value) {
              return `${value.toFixed(1)}s`
            },
          },
        },
        {
          // Right Y-axis for Block Time Average (series index 3)
          seriesName: 'Block Time Average (s)',
          opposite: true,
          title: {
            text: 'Block Time (s)',
            style: {
              color: isDark ? '#EAEFF5' : '#0B181E',
              fontSize: '12px',
              fontWeight: 600,
            },
          },
          labels: {
            style: {
              colors: isDark ? '#EAEFF5' : '#0B181E',
              fontSize: '11px',
            },
            formatter(value) {
              return `${value.toFixed(1)}s`
            },
          },
          min: 0,
        },
      ],
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        style: {
          fontSize: '12px',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        x: {
          formatter(value) {
            return `Block ${Math.round(value).toLocaleString()}`
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        markers: {
          width: 8,
          height: 8,
          radius: 2,
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5,
        },
      },
    }

    // Create the chart
    currentChart = new ApexCharts(chartContainer, options)
    await currentChart.render()

    isChartInitialized = true
    lastDataLength = dataToUse.labels.length
    lastProcessedData = dataToUse
  } catch (error) {
    console.error('Error initializing ApexCharts:', error)
    chartContainer.innerHTML = '<div class="flex items-center justify-center h-full text-red-400">Error loading chart. Retrying...</div>'
    // Don't set nodeError for chart rendering failures — the node connection may be fine.
    // Reset chart state so it retries on next renderChart() call.
    isChartInitialized = false
  }
}

// Update chart with new data (only add new points, don't change existing)
async function updateChart(newData) {
  if (!currentChart || !isChartInitialized) {
    return
  }

  try {
    // Check if we have new data (more data points than before)
    const currentDataLength = newData.labels.length
    const hasNewData = currentDataLength > lastDataLength

    if (!hasNewData) {
      return
    }

    // Only add the new data points, don't change existing ones
    const newSeries = newData.datasets.map((dataset, datasetIndex) => {
      const existingData = lastProcessedData ? lastProcessedData.datasets[datasetIndex].data : []
      const newDataPoints = dataset.data.slice(existingData.length)
      const newLabels = newData.labels.slice(existingData.length)

      return {
        name: dataset.label,
        data: newDataPoints.map((value, index) => ({
          x: newLabels[index],
          y: value,
        })),
      }
    })

    // Add new data points to the chart (this preserves existing data)
    await currentChart.appendData(newSeries, true)

    // Only auto-scroll if user hasn't interacted with the chart
    if (!userHasInteracted && newData.labels.length > 0) {
      const latestBlock = Math.max(...newData.labels)
      const viewWidth = currentViewRange.max - currentViewRange.min

      // Calculate new view range - scroll to the right to show latest data
      const newMin = Math.max(0, latestBlock - viewWidth + 20)
      const newMax = latestBlock + 20

      // Update our tracking
      currentViewRange = { min: newMin, max: newMax }

      // Smooth scroll to new range
      await currentChart.zoomX(newMin, newMax, true)
    }

    // Update tracking variables
    lastDataLength = currentDataLength
    lastProcessedData = newData
  } catch (error) {
    console.error('Error updating chart:', error)
  }
}

function renderChart() {
  // Get Chart data from Mongo
  const chartLineData = homechart.findOne()

  // Check if subscription is ready
  if (!chartLineData) {
    return
  }

  const dataToUse = chartLineData

  if (dataToUse !== undefined && dataToUse.labels && dataToUse.labels.length > 0 && dataToUse.datasets && dataToUse.datasets.length > 0) {
    // Hide loading animation
    const chartLoading = document.getElementById('chartLoading')
    if (chartLoading) {
      chartLoading.style.display = 'none'
    }

    // If chart is not initialized, initialize it
    if (!isChartInitialized) {
      initializeChart(dataToUse, false)
    } else {
      // Chart is already initialized, just update it smoothly
      updateChart(dataToUse)
    }
  } else {
    // Show waiting message
    const chartContainer = document.getElementById('chart-container')
    if (chartContainer) {
      chartContainer.innerHTML = `
        <div class="flex items-center justify-center h-full text-qrl-text-secondary">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-qrl-accent mx-auto mb-4"></div>
            <p class="text-lg font-semibold">Waiting for blockchain data...</p>
            <p class="text-sm mt-2">Connecting to QRL network</p>
          </div>
        </div>
      `
    }
  }
}

// Subscribe to chart data
Template.appHome.onCreated(function () {
  this.subscribe('homechart')
})

// Initialize chart when template is rendered
Template.appHome.onRendered(() => {
  // Set up reactive autorun to update chart when data changes
  Tracker.autorun(() => {
    renderChart()
  })

  // Set up auto-refresh with shorter interval for smoother updates
  chartIntervalHandle = Meteor.setInterval(() => {
    renderChart()
  }, 30000)
})

// Clean up when template is destroyed
Template.appHome.onDestroyed(() => {
  if (chartIntervalHandle) {
    Meteor.clearInterval(chartIntervalHandle)
  }
  if (currentChart) {
    currentChart.destroy()
    currentChart = null
  }
  isChartInitialized = false
  userHasInteracted = false
  lastDataLength = 0
  currentViewRange = { min: 0, max: 0 }
  lastProcessedData = null
})

// Reactive data source
Template.appHome.helpers({
  chartData() {
    return homechart.findOne()
  },
  isChartDataReady() {
    return this.subscriptionsReady()
  },
  nodeError() {
    const nE = Session.get('nodeError')
    if (!nE) {
      return false
    }
    return nE
  },
})
