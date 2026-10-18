import React from 'react';
import Details from '@theme/Details';

export default function MDXDetails(props) {
  const items = React.Children.toArray(props.children);
  const summary = items.find(
    (item) => React.isValidElement(item) && item.type === 'summary',
  );
  const children = <>{items.filter((item) => item !== summary)}</>;
  return (
    <Details {...props} summary={summary ?? props.summary}>
      {children}
    </Details>
  );
}
