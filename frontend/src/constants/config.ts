// 应用配置常量

export const PORTS = {
  FRONTEND: 3000,
  SERVER: 7001,
  // IMG_HOST: 8001, // 已废弃本地图床
};

export const API_BASE_URL = `http://localhost:${PORTS.SERVER}`;
// export const IMG_HOST_BASE_URL = `http://localhost:${PORTS.IMG_HOST}`; // 已废弃

// 图床相关配置
// 将上传地址指向后端主服务 (7001)，由后端负责对接 OSS
export const IMG_UPLOAD_URL = `${API_BASE_URL}/api/upload/image`;

// OSS 通常直接返回绝对路径，因此不需要前缀
export const IMG_ACCESS_URL_PREFIX = "";
