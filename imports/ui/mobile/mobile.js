import './mobile.html'
import { EXPLORER_VERSION } from '../../startup/both/index.js'
/* global LocalStore */

const updateStyleSheet = (filename) => {
  const newstylesheet = `/${filename}.css`
  if ($('#dynamic_css').length === 0) {
    $('head').append('<link>')
    const css = $('head').children(':last')
    css.attr({
      id: 'dynamic_css',
      rel: 'stylesheet',
      type: 'text/css',
      href: newstylesheet,
    })
  } else {
    $('#dynamic_css').attr('href', newstylesheet)
  }
}

Template.mobile.onCreated(() => {
//
})
Template.mobile.events({
  'click .themeToggle': () => {
    try {
      const x = LocalStore.get('theme')
      if (x === 'dark') {
        LocalStore.set('theme', 'light')
        updateStyleSheet('light')
        $('.sun').addClass('moon').removeClass('sun')
      } else {
        LocalStore.set('theme', 'dark')
        updateStyleSheet('dark')
        $('.moon').addClass('sun').removeClass('moon')
      }
    } catch (e) {
      // localstore not supported so work out what theme is in use and switch accordingly
      if ($('.main-content').css('background-image').indexOf('dark') > 0) {
        // light theme in use
        updateStyleSheet('dark')
        $('.moon').addClass('sun').removeClass('moon')
      } else {
        updateStyleSheet('light')
        $('.sun').addClass('moon').removeClass('sun')
      }
    }
  },
})
Template.mobile.helpers({
  qrlExplorerVersion() {
    return EXPLORER_VERSION
  },
  logo() {
    const x = LocalStore.get('theme')
    if (x === 'light') {
      return '/img/qrl-logo-dark.png'
    }
    return '/img/qrl-logo-white.png'
  },
  theme() {
    try {
      const x = LocalStore.get('theme')
      if (x === 'dark') {
        return 'sun'
      }
      return 'moon'
    } catch (e) {
      // localstore not supported so work out what theme is in use and switch accordingly
      if ($('.main-content').css('background-image').indexOf('dark') > 0) {
        // light theme in use
        return 'moon'
      }
      return 'sun'
    }
  },
  menuBlocksActive() {
    if (
      (FlowRouter.getRouteName() === 'Block.home') ||
      (FlowRouter.getRouteName() === 'Lastblocks.home')
    ) {
      return 'active'
    }
    return ''
  },
  menuTransactionsActive() {
    if (
      (FlowRouter.getRouteName() === 'Lasttx.home') ||
      (FlowRouter.getRouteName() === 'Tx.home') ||
      (FlowRouter.getRouteName() === 'Address.home')
    ) {
      return 'active'
    }
    return ''
  },
  menuStatusActive() {
    if ((FlowRouter.getRouteName() === 'Status.home') || (FlowRouter.getRouteName() === 'App.home')) {
      return 'active'
    }
    return ''
  },
  menuSearchActive() {
    if (FlowRouter.getRouteName() === 'Search.home') {
      return 'active'
    }
    return ''
  },
})
