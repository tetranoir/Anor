import React from 'react';
import cx from 'classnames/bind';

import { Champion } from '../knowledge/modeldata';

interface ChampionListProps {
  title: string;
  className?: string;
  champions: Champion[];
  onClick?: (championName: string) => void;
}

// Component that shows list of champions
export function ChampionList(props: ChampionListProps) {
  const {title, className, champions, onClick} = props;

  function handleOnClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLDivElement;
    const championId = target.textContent;
    onClick && onClick(championId);
  }

  const renderChampions = champions.map(c => (
    <div key={c.name} className="champion" onClick={handleOnClick}>
      {c.name}
    </div>
  ));
  return (
    <div className={cx('champion-list', className)}>
      <div className="title">{title} ({champions.length})</div>
      <div className="champions">{renderChampions}</div>
    </div>
  )
}
