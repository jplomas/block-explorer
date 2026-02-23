import { BigNumber } from 'bignumber.js'
import _ from 'underscore'
import qrlNft from '@theqrl/nft-providers'
import { lasttx } from '/imports/api/index.js'
import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import './lasttx.html'
import { SHOR_PER_QUANTA } from '../../../startup/both/index.js'

const getLastTxBorderTypeClass = (txType) => {
  const normalizedType = String(txType || '').toLowerCase()
  const borderClassByType = {
    transfer: 'border-type-transfer',
    coinbase: 'border-type-coinbase',
    transfer_token: 'border-type-token',
    token: 'border-type-token',
    message: 'border-type-message',
    document_notarisation: 'border-type-message',
    keybase: 'border-type-message',
    slave: 'border-type-slave',
    latticepk: 'border-type-lattice',
    // No dedicated stake class currently; keep stake with the multisig fallback.
    stake: 'border-type-multisig',
  }
  return borderClassByType[normalizedType] || 'border-type-multisig'
}

Template.lasttx.onCreated(() => {
  Meteor.subscribe('lasttx')
})

Template.lasttx.helpers({
  isHome() {
    return FlowRouter.getRouteName() === 'App.home'
  },
  isLastTx() {
    return FlowRouter.getRouteName() === 'Lasttx.home'
  },
  currentPage() {
    const page = parseInt(FlowRouter.getQueryParam('page'), 10) || 1
    return page
  },
  totalPages() {
    const res = lasttx.findOne({ _id: 'lasttx_singleton' })
    if (res && res.transactions) {
      return Math.ceil(res.transactions.length / 10) || 1
    }
    return 1
  },
  pagedTransactions() {
    const res = lasttx.findOne({ _id: 'lasttx_singleton' })
    if (res && res.transactions) {
      if (FlowRouter.getRouteName() === 'App.home') {
        return res.transactions.slice(0, 10)
      }
      const page = parseInt(FlowRouter.getQueryParam('page'), 10) || 1
      const start = (page - 1) * 10
      return res.transactions.slice(start, start + 10)
    }
    return []
  },
  pages() {
    const res = lasttx.findOne({ _id: 'lasttx_singleton' })
    if (res && res.transactions) {
      const totalPages = Math.ceil(res.transactions.length / 10)
      const pages = []
      for (let i = 1; i <= totalPages; i += 1) {
        pages.push({
          number: i,
          isActive: (parseInt(FlowRouter.getQueryParam('page'), 10) || 1) === i,
        })
      }
      // Simple pagination: show current page and a few around it if many
      const currentPage = parseInt(FlowRouter.getQueryParam('page'), 10) || 1
      if (pages.length <= 10) {
        return pages
      }
      if (currentPage <= 5) {
        return pages.slice(0, 9)
      }
      if (currentPage > pages.length - 5) {
        return pages.slice(pages.length - 9)
      }
      return pages.slice(currentPage - 5, currentPage + 4)
    }
    return []
  },
  pback() {
    const currentPage = parseInt(FlowRouter.getQueryParam('page'), 10) || 1
    return currentPage > 1
  },
  pforward() {
    const res = lasttx.findOne({ _id: 'lasttx_singleton' })
    if (res && res.transactions) {
      const totalPages = Math.ceil(res.transactions.length / 10)
      const currentPage = parseInt(FlowRouter.getQueryParam('page'), 10) || 1
      return currentPage < totalPages
    }
    return false
  },
  multipleDestinations() {
    if (this.explorer.outputs) {
      if (this.explorer.outputs.length > 1) {
        return true
      }
    }
    return false
  },
  lasttx() {
    const res = lasttx.findOne({ _id: 'lasttx_singleton' })
    return res
  },
  fromAddress() {
    return this.explorer.from_hex
  },
  toAddress() {
    if (this.explorer.outputs) {
      if (this.explorer.outputs.length > 1) {
        return `${this.explorer.outputs.length} destinations`
      }
      return this.explorer.outputs[0].address_hex
    }
    return ''
  },
  amount() {
    if (this.tx.transfer) {
      return this.explorer.totalTransferred
    }
    if (this.tx.transfer_token) {
      return this.explorer.totalTransferred
    }
    return ''
  },
  block() {
    if (this.header) {
      // this will be undefined for unconfirmed transactions
      return this.header.block_number
    }
    return ''
  },
  ts() {
    if (this.header) {
      const x = moment.unix(this.header.timestamp_seconds)
      return moment(x).format('HH:mm D MMM YYYY')
    }
    const x = moment.unix(this.timestamp_seconds)
    return moment(x).format('HH:mm D MMM YYYY')
  },
  zeroCheck() {
    let ret = false
    const x = lasttx.findOne({ _id: 'lasttx_singleton' })
    if (x) {
      if (x.transactions && x.transactions.length === 0) {
        ret = true
      }
    } else {
      ret = true
    }
    return ret
  },
  borderTypeClass(txType) {
    return getLastTxBorderTypeClass(txType)
  },
  isTransfer(txType) {
    if (txType === 'transfer') {
      return true
    }
    return false
  },
  isTokenCreation(txType) {
    if (txType === 'token') {
      return true
    }
    return false
  },
  isTokenTransfer(txType) {
    if (txType === 'transfer_token') {
      return true
    }
    return false
  },
  isNFT() {
    if (this.nft || this.explorer.nft) {
      return true
    }
    return false
  },
  isTransferNFT() {
    if (this.explorer.type === 'TRANSFER NFT') {
      return true
    }
    return false
  },
  providerID() {
    return `0x${this.explorer.nft.id}`
  },
  knownProvider() {
    const { id } = this.explorer.nft
    const from = this.explorer.from_hex
    let known = false
    _.each(qrlNft.providers, (provider) => {
      if (provider.id === `0x${id}`) {
        _.each(provider.addresses, (address) => {
          if (address === from) {
            known = true
          }
        })
      }
    })
    return known
  },
  providerURL() {
    const { id } = this.explorer.nft
    let url = ''
    _.each(qrlNft.providers, (provider) => {
      if (provider.id === `0x${id}`) {
        url = provider.url
      }
    })
    return url
  },
  providerName() {
    const { id } = this.explorer.nft
    let name = ''
    _.each(qrlNft.providers, (provider) => {
      if (provider.id === `0x${id}`) {
        name = provider.name
      }
    })
    return name
  },
  isCoinbaseTxn(txType) {
    if (txType === 'coinbase') {
      return true
    }
    return false
  },
  isSlaveTxn(txType) {
    if (txType === 'slave') {
      return true
    }
    return false
  },
  isLatticePKTxn(txType) {
    if (txType === 'latticePK') {
      return true
    }
    return false
  },
  isMessageTxn(txType) {
    if (txType === 'MESSAGE') {
      return true
    }
    return false
  },
  isMultiSigCreateTxn(txType) {
    if (txType === 'multi_sig_create') {
      return true
    }
    return false
  },
  isMultiSigSpendTxn(txType) {
    if (txType === 'multi_sig_spend') {
      return true
    }
    return false
  },

  isMultiSigVoteTxn(txType) {
    if (txType === 'multi_sig_vote') {
      return true
    }
    return false
  },
  isStake(txType) {
    if (txType === 'stake') {
      return true
    }
    return false
  },
  isCoinbase(txType) {
    if (txType === 'coinbase') {
      return true
    }
    return false
  },
  isSlave(txType) {
    if (txType === 'slave') {
      return true
    }
    return false
  },
  isLatticePK(txType) {
    if (txType === 'latticePK') {
      return true
    }
    return false
  },
  isMessage(txType) {
    if (txType === 'message') {
      return true
    }
    return false
  },

  isDocumentNotarisation(txType) {
    if (txType === 'DOCUMENT_NOTARISATION') {
      return true
    }
    return false
  },

  isKeybaseTxn(txType) {
    if (txType === 'KEYBASE') {
      return true
    }
    return false
  },
  isConfirmed(confirmed) {
    if (confirmed === 'true') {
      return true
    }
    return false
  },
  msVoteStatus(i) {
    try {
      if (i.tx.multi_sig_vote.unvote === true) {
        return 'Approval revoked'
      }
      return 'Approved'
    } catch (error) {
      return null
    }
  },
  msSpendAmount(i) {
    try {
      let sum = new BigNumber(0)
      _.each(i.tx.multi_sig_spend.amounts, (a) => {
        sum = sum.plus(a)
      })
      return sum.dividedBy(SHOR_PER_QUANTA).toNumber()
    } catch (error) {
      return null
    }
  },
})

Template.lasttx.events({
  'click .transactionRecord': (event) => {
    // Find the transaction hash in the clicked element
    const hashElement = event.currentTarget.querySelector('[data-full-text]')
    if (hashElement) {
      const transactionHash = hashElement.getAttribute('data-full-text')
      FlowRouter.go(`/tx/${transactionHash}`)
      window.scrollTo(0, 0)
    }
  },
  'keypress #paginator': (event) => {
    if (event.keyCode === 13) {
      const x = parseInt(document.getElementById('paginator').value, 10)
      const res = lasttx.findOne({ _id: 'lasttx_singleton' })
      if (res && res.transactions) {
        const totalPages = Math.ceil(res.transactions.length / 10) || 1
        if (x <= totalPages && x > 0) {
          FlowRouter.setQueryParams({ page: x })
          window.scrollTo(0, 0)
        }
      }
    }
  },
  'click button[qrl-data]': (event) => {
    const action = event.currentTarget.getAttribute('qrl-data')
    const currentPage = parseInt(FlowRouter.getQueryParam('page'), 10) || 1
    const res = lasttx.findOne({ _id: 'lasttx_singleton' })
    if (res && res.transactions) {
      const totalPages = Math.ceil(res.transactions.length / 10) || 1
      let newPage = currentPage
      if (action === 'forward') {
        newPage += 1
      } else if (action === 'back') {
        newPage -= 1
      }
      if (newPage <= totalPages && newPage > 0) {
        FlowRouter.setQueryParams({ page: newPage })
        window.scrollTo(0, 0)
      }
    }
  },
  'click .page-btn': (event) => {
    const newPage = parseInt(event.currentTarget.getAttribute('qrl-page'), 10)
    if (newPage) {
      FlowRouter.setQueryParams({ page: newPage })
      window.scrollTo(0, 0)
    }
  },
})
