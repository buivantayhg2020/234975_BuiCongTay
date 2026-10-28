
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const EMPTY_FORM = {
  bookId: "",
  title: "",
  author: "",
  category: "",
  publisher: "",
  publishYear: new Date().getFullYear(),
  isbn: "",
  quantity: 1,
  description: "",
};

const FIELDS = [
  ["bookId", "Mã sách", "text"],
  ["title", "Tên sách", "text"],
  ["author", "Tác giả", "text"],
  ["category", "Thể loại", "text"],
  ["publisher", "Nhà xuất bản", "text"],
  ["publishYear", "Năm xuất bản", "number"],
  ["isbn", "Mã ISBN", "text"],
  ["quantity", "Số lượng", "number"],
];

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Lỗi HTTP ${response.status}`);
  }

  return data;
}

function App() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  // Lấy danh sách và tìm kiếm sách
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());

        const suffix = params.toString() ? `?${params}` : "";
        const data = await apiRequest(
          `${API_URL}/api/books${suffix}`,
          { signal: controller.signal }
        );

        setBooks(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(`Không tải được danh sách sách: ${err.message}`);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, refreshKey]);

  function openCreateForm() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setFormOpen(true);
  }

  function openEditForm(book) {
    setEditing(book);
    setForm({
      bookId: book.bookId,
      title: book.title,
      author: book.author,
      category: book.category,
      publisher: book.publisher,
      publishYear: book.publishYear,
      isbn: book.isbn,
      quantity: book.quantity,
      description: book.description,
    });
    setError("");
    setFormOpen(true);
  }

  async function viewDetails(book) {
    setError("");

    try {
      const data = await apiRequest(
        `${API_URL}/api/books/${book._id}`
      );
      setDetail(data);
    } catch (err) {
      setError(`Không xem được chi tiết: ${err.message}`);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        ...form,
        publishYear: Number(form.publishYear),
        quantity: Number(form.quantity),
      };

      const url = editing
        ? `${API_URL}/api/books/${editing._id}`
        : `${API_URL}/api/books`;

      const result = await apiRequest(url, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setNotice(
        result.message ||
          (editing ? "Cập nhật sách thành công" : "Thêm sách thành công")
      );
      setFormOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteBook(book) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa sách "${book.title}" không?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        `${API_URL}/api/books/${book._id}`,
        { method: "DELETE" }
      );

      setNotice(result.message || "Xóa sách thành công");

      if (detail?._id === book._id) setDetail(null);

      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon">B</span>
          <span>Book<span className="brand-accent">Cloud</span></span>
        </a>
        <span className="api-status">
          <span className="status-dot" />
          Hệ thống quản lý sách
        </span>
      </header>

      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">CLOUD BOOK MANAGEMENT</span>
          <h1>Quản lý sách <span>thông minh</span></h1>
          <p>Quản lý kho sách, tra cứu và cập nhật dữ liệu dễ dàng.</p>
        </div>
        <div className="hero-decoration" aria-hidden="true">▤</div>
      </section>

      <section className="content">
        <div className="summary-grid">
          <article className="summary-card">
            <span className="summary-icon">▤</span>
            <div>
              <p>Tổng số sách</p>
              <strong>{books.length}</strong>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-icon">▥</span>
            <div>
              <p>Tổng số lượng</p>
              <strong>
                {books.reduce((sum, book) => sum + (book.quantity || 0), 0)}
              </strong>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-icon">⌕</span>
            <div>
              <p>Kết nối API</p>
              <strong className="summary-small">
                {error ? "Cần kiểm tra" : loading ? "Đang tải..." : "Sẵn sàng"}
              </strong>
            </div>
          </article>
        </div>

        <div className="section-heading">
          <div>
            <h2>Danh sách sách</h2>
            <p>Tra cứu và quản lý thông tin sách trong hệ thống.</p>
          </div>
          <button className="primary-button" onClick={openCreateForm}>
            <span>＋</span> Thêm sách mới
          </button>
        </div>

        <div className="toolbar">
          <span className="search-icon">⌕</span>
          <input
            aria-label="Tìm kiếm sách"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên sách, tác giả hoặc thể loại..."
          />
          {search && (
            <button
              className="clear-search"
              onClick={() => setSearch("")}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              ×
            </button>
          )}
        </div>

        {notice && (
          <div className="notice success-notice">
            <span>✓</span> {notice}
            <button onClick={() => setNotice("")} aria-label="Đóng">×</button>
          </div>
        )}

        {error && (
          <div className="notice error-notice">
            <span>!</span> {error}
            <button onClick={() => setError("")} aria-label="Đóng">×</button>
          </div>
        )}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mã sách</th>
                <th>Thông tin sách</th>
                <th>Thể loại</th>
                <th>Năm XB</th>
                <th>Số lượng</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="empty-state" colSpan="6">
                    <span className="spinner" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="6">
                    {error
                      ? "Không thể tải dữ liệu. Kiểm tra backend đang chạy."
                      : "Không tìm thấy sách phù hợp."}
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr key={book._id}>
                    <td><span className="book-id">{book.bookId}</span></td>
                    <td>
                      <div className="book-info">
                        <strong>{book.title}</strong>
                        <span>{book.author}</span>
                      </div>
                    </td>
                    <td><span className="category-tag">{book.category}</span></td>
                    <td>{book.publishYear}</td>
                    <td>
                      <span className={book.quantity === 0 ? "stock-zero" : "stock"}>
                        {book.quantity}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="action-button view-action"
                          onClick={() => viewDetails(book)}
                          title="Xem chi tiết"
                        >Xem</button>
                        <button
                          className="action-button edit-action"
                          onClick={() => openEditForm(book)}
                          title="Cập nhật"
                        >Sửa</button>
                        <button
                          className="action-button delete-action"
                          onClick={() => deleteBook(book)}
                          title="Xóa sách"
                        >Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>Hiển thị {books.length} sách</span>
          <span>Dữ liệu từ MongoDB Atlas</span>
        </div>

        <footer className="page-footer">
          BookCloud · Hệ thống quản lý sách trên nền tảng đám mây
        </footer>
      </section>

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setFormOpen(false);
        }}>
          <section className="modal form-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  {editing ? "UPDATE BOOK" : "NEW BOOK"}
                </span>
                <h2>{editing ? "Cập nhật sách" : "Thêm sách mới"}</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
                aria-label="Đóng"
              >×</button>
            </div>

            <form onSubmit={submitForm}>
              <div className="form-grid">
                {FIELDS.map(([name, label, type]) => (
                  <label className="field" key={name}>
                    <span>{label} <b>*</b></span>
                    <input
                      name={name}
                      type={type}
                      value={form[name]}
                      min={type === "number" ? (name === "quantity" ? 0 : 1) : undefined}
                      step={type === "number" ? 1 : undefined}
                      required
                      onChange={updateField}
                    />
                  </label>
                ))}
                <label className="field full-field">
                  <span>Mô tả <b>*</b></span>
                  <textarea
                    name="description"
                    value={form.description}
                    required
                    rows="3"
                    onChange={updateField}
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setFormOpen(false)}
                  disabled={saving}
                >Hủy</button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Thêm sách"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {detail && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDetail(null);
        }}>
          <section className="modal detail-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <span className="eyebrow">BOOK DETAILS</span>
                <h2>Chi tiết sách</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setDetail(null)}
                aria-label="Đóng"
              >×</button>
            </div>

            <h3 className="detail-title">{detail.title}</h3>
            <p className="detail-author">Tác giả: {detail.author}</p>

            <div className="detail-grid">
              {[
                ["Mã sách", detail.bookId],
                ["Thể loại", detail.category],
                ["Nhà xuất bản", detail.publisher],
                ["Năm xuất bản", detail.publishYear],
                ["ISBN", detail.isbn],
                ["Số lượng", detail.quantity],
              ].map(([label, value]) => (
                <div className="detail-item" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="description-box">
              <span>Mô tả</span>
              <p>{detail.description}</p>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setDetail(null)}>
                Đóng
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  setDetail(null);
                  openEditForm(detail);
                }}
              >Sửa sách</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
