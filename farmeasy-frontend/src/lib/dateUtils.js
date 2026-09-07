function formatDoubtDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

export { formatDoubtDate };
