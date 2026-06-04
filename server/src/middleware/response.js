/**
 * 统一响应格式
 */
function success(res, data, message = '操作成功') {
  return res.json({
    success: true,
    message,
    data
  });
}

function error(res, message = '操作失败', statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    message
  });
}

function paginate(res, data, total, page, pageSize, message = '查询成功') {
  return res.json({
    success: true,
    message,
    data: {
      list: data,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    }
  });
}

module.exports = {
  success,
  error,
  paginate
};
