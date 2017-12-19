/* eslint no-console: 0 */
/* ^^^ remove once testing complete
 */
import JSONFormatter from 'json-formatter-js'
import './address.html'
import '../../stylesheets/overrides.css'

const ab2str = buf => String.fromCharCode.apply(null, new Uint16Array(buf))

const addressResultsRefactor = (res) => {
  // rewrite all arrays as strings (Q-addresses) or hex (hashes)
  const output = res
  if (res.state) {
    // output.state.address = ab2str(output.state.address)
    output.state.txcount = output.state.transaction_hashes.length

    // transactions
    const transactions = []
    output.state.transaction_hashes.forEach((value) => {
      transactions.push({ txhash: Buffer.from(value).toString('hex') })
    })
    output.state.transactions = transactions

    // pubhashes
    const pubhashes = []
    output.state.pubhashes.forEach((value) => {
      const adjusted = Buffer.from(value).toString('hex')
      pubhashes.push(adjusted)
    })
    output.state.pubhashes = pubhashes

    // txhashes
    const transactionHashes = []
    output.state.transaction_hashes.forEach((value) => {
      const adjusted = Buffer.from(value).toString('hex')
      transactionHashes.push(adjusted)
    })
    output.state.transaction_hashes = transactionHashes
  }
  return output
}

const renderAddressBlock = () => {
  const aId = FlowRouter.getParam('aId')
  if (aId) {
    const req = {
      address: Buffer.from(aId, 'ascii'),
    }
    Meteor.call('getAddressState', req, (err, res) => {
      if (err) {
        Session.set('address', { error: err, id: aId })
      } else {
        if (res) {
          res.state.address = ab2str(res.state.address)
          res.state.balance *= 1e-8
          if (!(res.state.address)) {
            res.state.address = aId
          }
          if (parseInt(res.state.txcount, 10) === 0 && parseInt(res.state.nonce, 10) === 0) {
            res.state.empty_warning = true
          } else {
            res.state.empty_warning = false
          }
        }
        Session.set('address', addressResultsRefactor(res))
      }
    })
  }
  Meteor.call('QRLvalue', (err, res) => {
    if (err) {
      Session.set('qrl', 'Error getting value from API')
    } else {
      Session.set('qrl', res)
    }
  })
}

Template.address.onCreated(() => {
  Session.set('address', {})
  Session.set('addressTransactions', {})
  Session.set('qrl', 0)
  Session.set('fetchedTx', false)
  renderAddressBlock()
})

Template.address.helpers({
  address() {
    return Session.get('address')
  },
  addressTx() {
    let ret = []
    if (Session.get('addressTransactions').length > 0) {
      ret = Session.get('addressTransactions')
    }
    return ret
  },
  QRtext() {
    return FlowRouter.getParam('aId')
  },
  ts() {
    let x = ''
    if (Session.get('addressTransactions').length > 0) {
      if (moment.unix(this.transaction.header.timestamp.seconds).isValid()) {
        x = moment.unix(this.transaction.header.timestamp.seconds)
      }
    }
    return x
  },
  qrl() {
    const address = Session.get('address')
    try {
      const value = address.state.balance
      const x = Session.get('qrl')
      return Math.round((x * value) * 100) / 100
    } catch (e) {
      return 0
    }
  },
})

Template.address.events({
  'click .refresh': () => {
    Session.set('address', {})
    renderAddressBlock()
  },
  'click .close': () => {
    $('.message').hide()
  },
  'click #ShowTx': () => {
    $('table').show()
    const x = Session.get('fetchedTx')
    if (x === false) {
      const tx = Session.get('address').state.transactions
      Meteor.call('addressTransactions', tx, (err, res) => {
        if (err) {
          Session.set('addressTransactions', { error: err })
        } else {
          Session.set('addressTransactions', res)
          $('.loader').hide()
          Session.set('fetchedTx', true)
        }
      })
    }
    $('#ShowTx').hide()
    $('#HideTx').show()
  },
  'click #HideTx': () => {
    $('table').hide()
    $('.loader').hide()
    $('#ShowTx').show()
    $('#HideTx').hide()
  },
  'click .jsonclick': () => {
    if (!($('.json').html())) {
      const myJSON = Session.get('address')
      const formatter = new JSONFormatter(myJSON)
      $('.json').html(formatter.render())
    }
    $('.jsonbox').toggle()
  },
})

Template.address.onRendered(() => {
  this.$('.value').popup()
  Tracker.autorun(() => {
    FlowRouter.watchPathChange()
    Session.set('address', {})
    Session.set('addressTransactions', {})
    Session.set('qrl', 0)
    Session.set('fetchedTx', false)
    renderAddressBlock()
  })
})
