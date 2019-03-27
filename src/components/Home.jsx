// Libraries
import React from 'react'
import ReactTooltip from 'react-tooltip'
import { inject, observer } from 'mobx-react'
import { Link } from 'react-router-dom'
import DocumentTitle from 'react-document-title'

// Components
import Dashboard from './Dashboard'
import Dialog from './Dialog'
import Landing from './Landing'
import LegacyCups from './LegacyCups'
import Menu from './Menu'
import SystemInfo from './SystemInfo'
import Wallet from './Wallet'
import Welcome from './Welcome'
import Wizard from './Wizard'
import Footer from './Footer'

// Utils
import { getCurrentProviderName } from '../utils/blockchain'
import { capitalize } from '../utils/helpers'
import { getAssist } from '../utils/assist'

@inject('content')
@inject('network')
@inject('system')
@inject('dialog')
@inject('transactions')
@observer
class Home extends React.Component {
  constructor() {
    super()
    this.state = {
      wizardOpenCDP: false,
      migrateCDP: false
    }
  }

  setOpenCDPWizard = () => {
    this.setState({ wizardOpenCDP: true }, () => {
      ReactTooltip.rebuild()
    })
  }

  setOpenMigrate = migrateCDP => {
    this.setState({ migrateCDP }, () => {
      ReactTooltip.rebuild()
    })
  }

  componentDidMount = () => {
    getAssist()
  }

  render() {
    return (
      <DocumentTitle title="CDP Portal">
        <div
          className={
            (this.props.network.isConnected && this.props.network.defaultAccount
              ? 'is-connected'
              : 'is-not-connected') +
            (this.props.dialog.show ? ' dialog-open' : '') +
            (this.props.transactions.priceModal.open ||
            this.props.transactions.showCreatingCdpModal
              ? ' modal-open'
              : '')
          }
        >
          <div className="wrapper">
            {this.props.network.isConnected &&
              this.props.network.defaultAccount && (
                <Menu
                  page=""
                  showCDPs={
                    !this.props.system.tub.cupsLoading &&
                    Object.keys(this.props.system.tub.cups).length > 0
                  }
                  showLegacyCDPs={true}
                  setOpenMigrate={this.setOpenMigrate}
                  isMigrateCDPPage={this.state.migrateCDP}
                />
              )}
            <main className="main-column">
              {!this.props.network.isConnected ||
              !this.props.network.defaultAccount ? (
                <Landing />
              ) : (
                <React.Fragment>
                  {this.props.system.tub.cupsLoading ? (
                    <div>Loading...</div>
                  ) : this.state.migrateCDP ? (
                    <LegacyCups setOpenMigrate={this.setOpenMigrate} />
                  ) : Object.keys(this.props.system.tub.cups).length === 0 &&
                  !this.state.wizardOpenCDP ? (
                    <Welcome
                      setOpenMigrate={this.setOpenMigrate}
                      setOpenCDPWizard={this.setOpenCDPWizard}
                    />
                  ) : (
                    <React.Fragment>
                      {
                        <React.Fragment>
                          {Object.keys(this.props.system.tub.cups).length ===
                          0 ? (
                            <Wizard setOpenMigrate={this.setOpenMigrate} />
                          ) : (
                            <Dashboard setOpenMigrate={this.setOpenMigrate} />
                          )}
                        </React.Fragment>
                      }
                    </React.Fragment>
                  )}
                </React.Fragment>
              )}
            </main>
            <aside className="right-column">
              {
                <div className="right-column-content">
                  {this.props.network.loadingAddress ? (
                    <div style={{ padding: '1.7em 3.38em' }}>
                      {this.props.network.waitingForAccessApproval ? (
                        <React.Fragment>
                          Waiting for approval to access to your account...
                        </React.Fragment>
                      ) : (
                        <React.Fragment>
                          Loading...
                          {this.props.transactions.amountCheck > 4 && (
                            <React.Fragment>
                              &nbsp;Node is momentarily out of sync.<br />
                              If it takes longer,&nbsp;
                              {!this.props.network.hw.active
                                ? getCurrentProviderName() === 'metamask'
                                  ? 'you can try switching to another network and back again to help fix this issue, or turning Metamask off and on again.'
                                  : `please try restarting ${getCurrentProviderName() !==
                                    'other'
                                      ? capitalize(getCurrentProviderName())
                                      : 'your client'}, then refresh the page.`
                                : 'please try refreshing the page.'}
                            </React.Fragment>
                          )}
                        </React.Fragment>
                      )}
                    </div>
                  ) : (
                    <React.Fragment>
                      <Wallet />
                      {this.props.network.defaultAccount && <SystemInfo />}
                    </React.Fragment>
                  )}
                  <div className="footer col col-no-border typo-cs typo-grid-grey">
                    {!this.props.network.loadingAddress && (
                      <Link to="/terms" target="_blank">
                        Terms of Service
                      </Link>
                    )}
                  </div>
                </div>
              }
            </aside>
          </div>
          {(!this.props.network.isConnected ||
            !this.props.network.defaultAccount) && <Footer />}
          <Dialog />
          <ReactTooltip
            id="tooltip-root"
            place="top"
            type="light"
            effect="solid"
            html={true}
            scrollHide={true}
            delayHide={300}
            delayShow={200}
          />
        </div>
      </DocumentTitle>
    )
  }
}

export default Home
