'use client';

import { Polyline, Popup } from 'react-leaflet';
import DeleteLinkButton from './DeleteLinkButton';

export default function LinkLine({ link, setLinks }) {
  return (
    <Polyline
      positions={[
        [link.from_node.latitude, link.from_node.longitude],
        [link.to_node.latitude, link.to_node.longitude]
      ]}
      pathOptions={{ color: 'cyan', weight: 4 }}
    >
      <Popup>
        <div style={{ minWidth: '220px' }}>
          <b>🔗 Fiber Link</b>
          <hr />

          <b>From:</b> {link.from_node.node_id} <br />
          <b>To:</b> {link.to_node.node_id} <br />
          <b>Core:</b> {link.fiber_core}

          {/* ✅ Separate Delete Button */}
          <DeleteLinkButton
            link={link}
            setLinks={setLinks}
          />
        </div>
      </Popup>
    </Polyline>
  );
}