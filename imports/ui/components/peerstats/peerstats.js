import { peerstats } from '/imports/api/index.js'
import './peerstats.html'

Template.peerstats.onCreated(() => {
  Meteor.subscribe('peerstats')
})

Template.peerstats.helpers({
  peerstats() {
    const res = peerstats.findOne({ _id: 'peerstats_singleton' })
    return res
  },
  ts() {
    const x = moment.unix(this.node_chain_state.timestamp)
    return moment(x).format('HH:mm D MMM YYYY')
  },
  zeroCheck() {
    const x = peerstats.findOne({ _id: 'peerstats_singleton' })
    if (x) {
      return !Array.isArray(x.peers_stat) || x.peers_stat.length === 0
    }
    return true
  },
})
