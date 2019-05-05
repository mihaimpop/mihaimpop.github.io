import React from 'react';
import {
  TiSocialAtCircular,
  TiSocialFacebookCircular,
  TiSocialGithubCircular,
  TiSocialInstagramCircular,
  TiSocialLinkedinCircular,
} from 'react-icons/ti';

export const config = {
  links: [
    {
      icon: <TiSocialAtCircular/>,
      title: 'Gmail',
      url: 'mailto:mihai.m.m.pop@gmail.com'
    },
    {
      icon: <TiSocialFacebookCircular/>,
      title: 'Facebook',
      url: 'https://www.facebook.com/mihaimmpop'
    },
    {
      icon: <TiSocialGithubCircular/>,
      title: 'Github',
      url: 'https://github.com/mihaimpop'
    },
    {
      icon: <TiSocialInstagramCircular/>,
      title: 'Instagram',
      url: 'https://www.instagram.com/mihaimpop'
    },
    {
      icon: <TiSocialLinkedinCircular/>,
      title: 'Linkedin',
      url: 'https://www.linkedin.com/in/mihaimpop'
    }
  ]
};
