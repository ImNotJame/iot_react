import { useCallback, useEffect, useState } from "react";
import { itemsApi } from "../../../api";

const EMPTY_ITEM = { name: "", description: "", price: "", tax: "" };

function ItemsPage() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [editingId, setEditingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await itemsApi.getAll();
      setItems(data);
    } catch (error) {
      console.error("Error fetching items:", error);
      setErrorMessage(error.message || "Unable to load items right now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addItem = async () => {
    if (!newItem.name || !newItem.price) {
      setErrorMessage("Please fill in at least Name and Price.");
      return;
    }

    try {
      setErrorMessage("");
      await itemsApi.create(newItem);
      setNewItem(EMPTY_ITEM);
      await fetchItems();
    } catch (error) {
      console.error("Error adding item:", error);
      setErrorMessage(error.message || "Unable to add the item.");
    }
  };

  const deleteItem = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this item?");
    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");
      await itemsApi.delete(id);
      await fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      setErrorMessage(error.message || "Unable to delete the item.");
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingItem({ ...item });
    setErrorMessage("");
  };

  const saveEdit = async () => {
    if (!editingItem?.name || !editingItem?.price) {
      setErrorMessage("Please fill in at least Name and Price.");
      return;
    }

    try {
      setErrorMessage("");
      await itemsApi.update(editingId, editingItem);
      setEditingId(null);
      setEditingItem(null);
      await fetchItems();
    } catch (error) {
      console.error("Error updating item:", error);
      setErrorMessage(error.message || "Unable to update the item.");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingItem(null);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchItems();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchItems]);

  return (
    <section className="panel-stack">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Inventory operations</p>
          <h2>Manage Items</h2>
        </div>
        <button type="button" onClick={fetchItems} className="secondary-button">
          {isLoading ? "Refreshing..." : "Refresh Items"}
        </button>
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="form-card">
        <h3>Add New Item</h3>
        <div className="field-grid">
          <input
            type="text"
            placeholder="Name *"
            value={newItem.name}
            onChange={(event) => setNewItem({ ...newItem, name: event.target.value })}
          />
          <input
            type="text"
            placeholder="Description"
            value={newItem.description}
            onChange={(event) =>
              setNewItem({ ...newItem, description: event.target.value })
            }
          />
          <input
            type="number"
            placeholder="Price *"
            value={newItem.price}
            onChange={(event) => setNewItem({ ...newItem, price: event.target.value })}
          />
          <input
            type="number"
            placeholder="Tax"
            value={newItem.tax}
            onChange={(event) => setNewItem({ ...newItem, tax: event.target.value })}
          />
        </div>
        <button type="button" onClick={addItem} className="primary-button">
          Add Item
        </button>
      </div>

      <div className="table-card">
        {items.length === 0 ? (
          <p className="empty-state">No items yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Price</th>
                <th>Tax</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editingItem.name}
                        onChange={(event) =>
                          setEditingItem({ ...editingItem, name: event.target.value })
                        }
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td>
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editingItem.description || ""}
                        onChange={(event) =>
                          setEditingItem({
                            ...editingItem,
                            description: event.target.value,
                          })
                        }
                      />
                    ) : (
                      item.description || "-"
                    )}
                  </td>
                  <td>
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={editingItem.price}
                        onChange={(event) =>
                          setEditingItem({ ...editingItem, price: event.target.value })
                        }
                      />
                    ) : (
                      `$${item.price}`
                    )}
                  </td>
                  <td>
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={editingItem.tax || ""}
                        onChange={(event) =>
                          setEditingItem({ ...editingItem, tax: event.target.value })
                        }
                      />
                    ) : item.tax ? (
                      `$${item.tax}`
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="actions-cell">
                    {editingId === item.id ? (
                      <>
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="success-button table-button"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="ghost-button table-button"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="secondary-button table-button"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="danger-button table-button"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default ItemsPage;
