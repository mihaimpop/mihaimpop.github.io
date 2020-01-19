import React from 'react';
import PropTypes from 'prop-types';
import ReactGA from 'react-ga';

import locales from './locales';
import ProfilePic from '../../img/profile.jpg';

class InfoCard extends React.Component {
  constructor(props) {
    super(props);
    const {config: {links}} = props;
    this.state = {
      links: links || []
    };
  }

  handleLink = (url, title) => {
    ReactGA.event({
      category: 'Social',
      action: `Navigate to - ${title} - ${url}`,
    });
  }

  render() {
    const {links} = this.state;
    return (
      <div className="InfoCard content--width content--pading backdrop-blur">
        <div className="ProfilePictureContainer">
          <img className="ProfilePicture" src={ProfilePic} alt="profile-face-pic"/>
        </div>
        <div className="InfoCard-Content">
          <div className="Credentials">
            <span className="Name">{locales.name}</span>
            <span className="Position">{locales.position}</span>
          </div>

          <div className="Bio">
            {/* <span>{locales.bioL1}</span> */}
            <span className="bio-padding">{locales.bioL11}</span>
            <span className="bio-padding">{locales.bioL3}</span>
          </div>

          <div className="Education">
            <span className="bold-600">{locales.education}</span>
            <span>{locales.universityName}</span>
          </div>

          <div className="Links">
            {
              links.map(({icon, title, url}, id) =>
                <div className="info-link" key={`social-${id}`} title={url}>
                  <a
                    className="Social-Link"
                    href={url}
                    onClick={this.handleLink.bind(null, url, title)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {icon}
                  </a>
                </div>
              )
            }
          </div>
        </div>
      </div>
    );
  }

}

InfoCard.propTypes = {
  config: PropTypes.object
};

export default InfoCard;
