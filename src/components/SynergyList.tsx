import React from 'react';
import cx from 'classnames/bind';

import { SynergyThreshold } from '../knowledge/modelapp';

interface SynergyListProps {
  title: string;
  className?: string;
  synThreshes: SynergyThreshold[];
}

export function SynergyList(props: SynergyListProps) {
  const {synThreshes, title, className} = props;
  const renderThresholds = synThreshes.map(({name, threshes}) => (
    <div key={name} className="synergy">
      <div className="name">{name}</div>
      {threshes.map(([count, threshStr]) => (
        <div key={threshStr} className="flex">
          <div className="threshold">{Math.abs(count)}</div>
          <div className="synergy-detail">{threshStr}</div>
        </div>
      ))}
    </div>
  ));

  return (
    <div className={cx('synergy-list', className)}>
      <div className="title">{title}</div>
      <div className="synergies">{renderThresholds}</div>
    </div>
  );
}
