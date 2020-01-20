import React, { Component } from 'react'
import ReactGA from 'react-ga'

import './App.css'
import Background from './components/Background/Background'
import InfoCardContainer from './components/InfoCard/InfoCard.container'

class App extends Component {
  componentDidMount() {
    ReactGA.initialize('UA-127063636-1')
    ReactGA.pageview('personal-landing-page')
  }

  render() {
    return (
      <div className="App">
        <Background>{InfoCardContainer}</Background>
      </div>
    )
  }
}

export default App
