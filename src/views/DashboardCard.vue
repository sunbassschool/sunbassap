<template>
    <div class="col-12 col-md-4">
      <div class="dashboard-card">
        <h3>{{ title }}</h3>
        <p>{{ content }}</p>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: "DashboardCard",
    props: {
      title: String,
      content: String,
    },
  };
  </script>
  
  <style scoped>
  .dashboard-card {
    border-radius: 10px;
    background-color: #f8f9fa;
    padding: 20px;
    margin: 10px 0;
  }
  
  .dashboard-card h3 {
    font-size: 1.5rem;
  }
  </style>
  