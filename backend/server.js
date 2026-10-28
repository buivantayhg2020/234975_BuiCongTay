require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Khai báo cấu trúc dữ liệu sách
const bookSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    publisher: {
      type: String,
      required: true,
      trim: true
    },
    publishYear: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger
    },
    isbn: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger
    },
    description: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: "books"
  }
);

const Book = mongoose.model("Book", bookSchema);

// 2. Kiểm tra dữ liệu đầu vào
const requiredFields = [
  "bookId",
  "title",
  "author",
  "category",
  "publisher",
  "publishYear",
  "isbn",
  "quantity",
  "description"
];

function validateBook(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Dữ liệu JSON không hợp lệ" };
  }

  const data = {};

  for (const field of requiredFields) {
    const value = body[field];

    if (value === undefined || value === null) {
      return { error: `Thiếu trường ${field}` };
    }

    if (field === "publishYear" || field === "quantity") {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        return { error: `${field} phải là số nguyên` };
      }

      if (field === "publishYear" && value < 1) {
        return { error: "Năm xuất bản không hợp lệ" };
      }

      if (field === "quantity" && value < 0) {
        return { error: "Số lượng không được âm" };
      }

      data[field] = value;
    } else {
      if (typeof value !== "string" || !value.trim()) {
        return { error: `${field} không được để trống` };
      }

      data[field] = value.trim();
    }
  }

  return { data };
}

// 3. GET /health - Kiểm tra trạng thái backend và database
app.get("/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "unavailable",
    database: connected ? "connected" : "disconnected"
  });
});

// 4. GET /api/books - Lấy danh sách và tìm kiếm sách
app.get("/api/books", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    let filter = {};

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(escapedSearch, "i");

      filter = {
        $or: [
          { title: regex },
          { author: regex },
          { category: regex }
        ]
      };
    }

    const books = await Book.find(filter).sort({ createdAt: -1 });

    res.status(200).json(books);
  } catch (error) {
    next(error);
  }
});

// 5. GET /api/books/:id - Xem thông tin một sách
app.get("/api/books/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "ID sách không hợp lệ"
      });
    }

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách"
      });
    }

    res.status(200).json(book);
  } catch (error) {
    next(error);
  }
});

// 6. POST /api/books - Thêm sách mới
app.post("/api/books", async (req, res, next) => {
  try {
    const result = validateBook(req.body);

    if (result.error) {
      return res.status(400).json({
        message: result.error
      });
    }

    const duplicate = await Book.findOne({
      bookId: result.data.bookId
    });

    if (duplicate) {
      return res.status(409).json({
        message: "Mã sách đã tồn tại"
      });
    }

    const book = await Book.create(result.data);

    res.status(201).json({
      message: "Thêm sách thành công",
      data: book
    });
  } catch (error) {
    next(error);
  }
});

// 7. PUT /api/books/:id - Cập nhật sách
app.put("/api/books/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "ID sách không hợp lệ"
      });
    }

    const result = validateBook(req.body);

    if (result.error) {
      return res.status(400).json({
        message: result.error
      });
    }

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách"
      });
    }

    const duplicate = await Book.findOne({
      bookId: result.data.bookId,
      _id: { $ne: book._id }
    });

    if (duplicate) {
      return res.status(409).json({
        message: "Mã sách đã tồn tại"
      });
    }

    book.set(result.data);
    await book.save();

    res.status(200).json({
      message: "Cập nhật sách thành công",
      data: book
    });
  } catch (error) {
    next(error);
  }
});

// 8. DELETE /api/books/:id - Xóa sách
app.delete("/api/books/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "ID sách không hợp lệ"
      });
    }

    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách"
      });
    }

    res.status(200).json({
      message: "Xóa sách thành công",
      data: book
    });
  } catch (error) {
    next(error);
  }
});

// 9. Xử lý lỗi chung
app.use((error, req, res, next) => {
  console.error("API Error:", error.message);

  if (error.code === 11000) {
    return res.status(409).json({
      message: "Mã sách đã tồn tại"
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError" ||
    error instanceof SyntaxError
  ) {
    return res.status(400).json({
      message: "Dữ liệu không hợp lệ"
    });
  }

  res.status(500).json({
    message: "Lỗi máy chủ hoặc cơ sở dữ liệu"
  });
});

// 10. Kết nối MongoDB Atlas và khởi động server
async function startServer() {
  if (!process.env.MONGODB_URI) {
    console.error("Thiếu biến môi trường MONGODB_URI trong file .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });

    console.log("Da ket noi MongoDB Atlas");
  } catch (error) {
    console.error("Khong ket noi duoc MongoDB:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`Backend dang chay tai http://localhost:${PORT}`);
  });
}

startServer();