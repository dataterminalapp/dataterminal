import React from 'react';

interface Props {
    count: number;
}

const DistinctCountBadge = ({ count }: Props) => (
  <span className="inline-flex items-center px-3 py-0.5 rounded-full  font-medium text-gray-500">
    {count} values
  </span>
);

export default DistinctCountBadge;

