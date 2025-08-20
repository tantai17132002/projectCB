module.exports = {
  // Sử dụng dấu nháy đơn thay vì nháy kép cho string
  // Ví dụ: 'hello' thay vì "hello"
  // Lý do: Nhất quán với style guide phổ biến, dễ đọc hơn
  singleQuote: true,

  // Thêm dấu phẩy ở cuối mỗi item trong object/array
  // Ví dụ: { a: 1, b: 2, } thay vì { a: 1, b: 2 }
  // Lý do: Dễ thêm item mới, git diff sạch hơn
  trailingComma: 'all',

  // Độ rộng tối đa của mỗi dòng code (tính bằng ký tự)
  // Khi vượt quá 100 ký tự, Prettier sẽ tự động xuống dòng
  // Lý do: Đảm bảo code dễ đọc trên mọi màn hình
  printWidth: 100,

  // Số khoảng trắng cho mỗi level indent
  // Ví dụ: 2 spaces cho mỗi level
  tabWidth: 2,

  // Sử dụng space thay vì tab
  // Lý do: Nhất quán trên mọi editor và hệ điều hành
  useTabs: false,

  // Thêm dấu chấm phẩy ở cuối statement
  // Ví dụ: const x = 1; thay vì const x = 1
  // Lý do: Tránh lỗi ASI (Automatic Semicolon Insertion)
  semi: true,

  // Xuống dòng sau dấu phẩy trong object/array
  // Ví dụ: { a: 1, b: 2 } trên cùng 1 dòng
  // Lý do: Tiết kiệm không gian, dễ đọc
  bracketSpacing: true,

  // Xuống dòng sau dấu > trong JSX
  // Ví dụ: <div>content</div> trên cùng 1 dòng
  // Lý do: Tiết kiệm không gian cho JSX
  bracketSameLine: false,

  // Xuống dòng sau dấu => trong arrow function
  // Ví dụ: (a, b) => { return a + b; }
  // Lý do: Nhất quán với style guide
  arrowParens: 'always',

  // Xuống dòng sau dấu ? trong ternary operator
  // Ví dụ: condition ? value1 : value2
  // Lý do: Dễ đọc hơn khi có nhiều điều kiện
  endOfLine: 'lf',
};
