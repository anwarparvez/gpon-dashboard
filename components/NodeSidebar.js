'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';

export default function NodeSidebar({
  draft,
  selectedNode,
  setSelectedNode,
  setDraft,
  setNodes,
  setLinks
}) {

  const isEdit = draft?.isEdit;
  const isAdd = draft && !draft.isEdit;
  const isView = !draft && selectedNode;

  if (!draft && !selectedNode) return null;

  const node = draft;

  // ✅ SAVE NODE
  const handleSave = async () => {
    try {
      const res = await fetch('/api/nodes', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Save failed');
        return;
      }

      if (isEdit) {
        setNodes(prev =>
          prev.map(n => n._id === data._id ? data : n)
        );
      } else {
        setNodes(prev => [data, ...prev]);
      }

      setDraft(null);

    } catch (err) {
      console.error(err);
      alert('Error saving node');
    }
  };

  // 🗑 DELETE NODE
  const handleDelete = async () => {
    if (!confirm(`Delete node ${selectedNode.node_id}?`)) return;

    try {
      const res = await fetch('/api/nodes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedNode._id })
      });

      if (!res.ok) {
        alert("Delete failed");
        return;
      }

      // ✅ remove node
      setNodes(prev =>
        prev.filter(n => n._id !== selectedNode._id)
      );

      // ✅ remove related links
      setLinks(prev =>
        prev.filter(l =>
          l.from_node?._id !== selectedNode._id &&
          l.to_node?._id !== selectedNode._id
        )
      );

      setSelectedNode(null);

    } catch (err) {
      console.error(err);
      alert("Delete error");
    }
  };

  // ✏️ START EDIT
  const startEdit = () => {
    setDraft({ ...selectedNode, isEdit: true });
    setSelectedNode(null);
  };

  // 🔄 UPDATE FIELD
  const updateField = (key, value) => {
    setDraft(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="fixed right-0 top-[60px] w-[320px] h-[calc(100%-60px)] bg-white dark:bg-gray-900 text-black dark:text-white p-4 z-[2000] shadow-lg">

      <h3 className="text-lg font-semibold mb-4">
        {isView && '📍 Node Details'}
        {isAdd && '➕ Add Node'}
        {isEdit && '✏️ Edit Node'}
      </h3>

      {/* ================= VIEW ================= */}
      {isView && (
        <div className="space-y-2 text-sm">

          <div><b>ID:</b> {selectedNode.node_id}</div>
          <div><b>Name:</b> {selectedNode.name}</div>
          <div><b>Type:</b> {selectedNode.node_category}</div>
          <div><b>Status:</b> {selectedNode.status}</div>
          <div><b>Region:</b> {selectedNode.region}</div>
          <div><b>Code:</b> {selectedNode.node_code}</div>
          <div><b>Address:</b> {selectedNode.address}</div>

          <div className="text-xs text-muted-foreground mt-2">
            📍 {selectedNode.latitude?.toFixed(5)}, {selectedNode.longitude?.toFixed(5)}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={startEdit} className="flex-1">Edit</Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">
              Delete
            </Button>
          </div>

        </div>
      )}

      {/* ================= ADD / EDIT ================= */}
      {(isAdd || isEdit) && draft && (
        <div className="space-y-3">

          <Input
            placeholder="Node Name"
            value={draft.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
          />

          {/* CATEGORY */}
          <Select
            value={draft.node_category ?? 'ODP'}
            onValueChange={(v) => updateField('node_category', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>

            <SelectContent className="z-[4000]">
              <SelectItem value="OLT">OLT</SelectItem>
              <SelectItem value="OCC">OCC</SelectItem>
              <SelectItem value="ODP">ODP</SelectItem>
              <SelectItem value="HODP">HODP</SelectItem>
              <SelectItem value="Branch Point">Branch Point</SelectItem>
            </SelectContent>
          </Select>

          {/* STATUS */}
          <Select
            value={draft.status ?? 'proposed'}
            onValueChange={(v) => updateField('status', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>

            <SelectContent className="z-[4000]">
              <SelectItem value="existing">Existing</SelectItem>
              <SelectItem value="proposed">Proposed</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Region"
            value={draft.region || ''}
            onChange={(e) => updateField('region', e.target.value)}
          />

          <Input
            placeholder="Node Code"
            value={draft.node_code || ''}
            onChange={(e) => updateField('node_code', e.target.value)}
          />

          <Input
            placeholder="Address"
            value={draft.address || ''}
            onChange={(e) => updateField('address', e.target.value)}
          />

          {/* LOCATION */}
          <div className="text-xs text-muted-foreground">
            📍 {draft.latitude?.toFixed(5)}, {draft.longitude?.toFixed(5)}
          </div>

          {/* ACTIONS */}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              {isEdit ? 'Update' : 'Save'}
            </Button>

            <Button
              variant="secondary"
              onClick={() => setDraft(null)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>

        </div>
      )}

      {/* CLOSE */}
      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={() => {
          setDraft(null);
          setSelectedNode(null);
        }}
      >
        Close
      </Button>

    </div>
  );
}