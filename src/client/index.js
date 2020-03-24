import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Aldia from './Aldia';
import * as serviceWorker from './serviceWorker';
import { Theme, getTheme } from "react-uwp/Theme";

ReactDOM.render(
  <Theme
    theme={getTheme({
      themeName: "dark", // set custom theme
      accent: "#614AA1", // set accent color
      useFluentDesign: true, // sure you want use new fluent design.
    })}
  >
    <Aldia />
  </Theme>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
