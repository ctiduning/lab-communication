<template>
  <div class="orders-container">
    <header class="header">
      <div class="header-left">
        <h1>订单管理</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showCreateModal = true" icon="plus">新建订单</el-button>
      </div>
    </header>
    
    <aside class="sidebar">
      <el-menu :default-active="'orders'" class="sidebar-menu">
        <el-menu-item index="home" @click="goToHome">
          <template #icon><el-icon><House /></el-icon></template>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="orders" @click="goToOrders">
          <template #icon><el-icon><Document /></el-icon></template>
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="communications" @click="goToCommunications">
          <template #icon><el-icon><Message /></el-icon></template>
          <span>沟通中心</span>
        </el-menu-item>
        <el-menu-item index="notifications" @click="goToNotifications">
          <template #icon><el-icon><Bell /></el-icon></template>
          <span>通知消息</span>
        </el-menu-item>
        <el-menu-item v-if="user.role === 'admin'" index="admin" @click="goToAdmin">
          <template #icon><el-icon><Setting /></el-icon></template>
          <span>系统管理</span>
        </el-menu-item>
      </el-menu>
    </aside>
    
    <main class="main-content">
      <div class="filter-bar">
        <el-select v-model="filterStatus" placeholder="状态筛选">
          <el-option label="全部" value="all"></el-option>
          <el-option label="待处理" value="pending"></el-option>
          <el-option label="处理中" value="processing"></el-option>
          <el-option label="已完成" value="completed"></el-option>
          <el-option label="加急" value="urgent"></el-option>
        </el-select>
        <el-input v-model="searchKeyword" placeholder="搜索订单号或客户名称" style="width: 300px;"></el-input>
        <el-button @click="handleSearch" icon="search">搜索</el-button>
      </div>
      
      <el-table :data="orders" border>
        <el-table-column prop="order_no" label="订单号"></el-table-column>
        <el-table-column prop="customer_name" label="客户名称"></el-table-column>
        <el-table-column prop="product_name" label="产品名称"></el-table-column>
        <el-table-column prop="test_items" label="检测项目" :show-overflow-tooltip="true"></el-table-column>
        <el-table-column prop="lab_group" label="检测组"></el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="getStatusTag(scope.row.status)">{{ getStatusName(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止日期"></el-table-column>
        <el-table-column prop="created_at" label="创建时间"></el-table-column>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button size="small" @click="viewOrder(scope.row)">查看</el-button>
            <el-button size="small" type="primary" @click="createComm(scope.row)">发起沟通</el-button>
          </template>
        </el-table-column>
      </el-table>
    </main>
    
    <el-dialog title="新建订单" v-model="showCreateModal">
      <el-form :model="orderForm" label-width="100px">
        <el-form-item label="订单号">
          <el-input v-model="orderForm.order_no"></el-input>
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input v-model="orderForm.customer_name"></el-input>
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input v-model="orderForm.product_name"></el-input>
        </el-form-item>
        <el-form-item label="检测项目">
          <el-input type="textarea" v-model="orderForm.test_items"></el-input>
        </el-form-item>
        <el-form-item label="检测组">
          <el-select v-model="orderForm.lab_group">
            <el-option label="理化组" value="理化组"></el-option>
            <el-option label="微生物组" value="微生物组"></el-option>
            <el-option label="色谱组" value="色谱组"></el-option>
            <el-option label="质谱组" value="质谱组"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="orderForm.deadline" type="datetime"></el-date-picker>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateModal = false">取消</el-button>
        <el-button type="primary" @click="handleCreateOrder">确认创建</el-button>
      </template>
    </el-dialog>
    
    <el-dialog title="订单详情" v-model="showDetailModal">
      <el-form :model="selectedOrder" label-width="100px">
        <el-form-item label="订单号">
          <el-input :value="selectedOrder.order_no" disabled></el-input>
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input :value="selectedOrder.customer_name" disabled></el-input>
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input :value="selectedOrder.product_name" disabled></el-input>
        </el-form-item>
        <el-form-item label="检测项目">
          <el-input type="textarea" :value="selectedOrder.test_items" disabled></el-input>
        </el-form-item>
        <el-form-item label="检测组">
          <el-input :value="selectedOrder.lab_group" disabled></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-tag :type="getStatusTag(selectedOrder.status)">{{ getStatusName(selectedOrder.status) }}</el-tag>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-input :value="selectedOrder.deadline" disabled></el-input>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-input :value="selectedOrder.created_at" disabled></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDetailModal = false">关闭</el-button>
      </template>
    </el-dialog>
    
    <el-dialog title="发起沟通" v-model="showCommModal">
      <el-form :model="commForm" label-width="100px">
        <el-form-item label="沟通类型">
          <el-select v-model="commForm.type">
            <el-option label="加急" value="urgent"></el-option>
            <el-option label="延迟沟通" value="delay"></el-option>
            <el-option label="提前出报告" value="report"></el-option>
            <el-option label="不合格确认" value="unqualified"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="沟通内容">
          <el-input type="textarea" v-model="commForm.content"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCommModal = false">取消</el-button>
        <el-button type="primary" @click="handleCreateComm">确认发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { House, Document, Message, Bell, Setting } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { orderAPI, communicationAPI } from '../api';
const router = useRouter();
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const orders = ref([]);
const filterStatus = ref('all');
const searchKeyword = ref('');
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const showCommModal = ref(false);
const selectedOrder = ref({});
const orderForm = reactive({
 order_no: '',
 customer_name: '',
 product_name: '',
 test_items: '',
 lab_group: '',
 deadline: ''
});
const commForm = reactive({
 type: '',
 content: ''
});
const filteredOrders = computed(() => {
 let result = orders.value;
 if (filterStatus.value !== 'all') {
 result = result.filter(o => o.status === filterStatus.value);
 }
 if (searchKeyword.value) {
 const keyword = searchKeyword.value.toLowerCase();
 result = result.filter(o => o.order_no.toLowerCase().includes(keyword) ||
 o.customer_name.toLowerCase().includes(keyword));
 }
 return result;
});
const goToHome = () => {
 router.push('/');
};
const goToOrders = () => {
 router.push('/orders');
};
const goToCommunications = () => {
 router.push('/communications');
};
const goToNotifications = () => {
 router.push('/notifications');
};
const goToAdmin = () => {
 router.push('/admin');
};
const getStatusTag = (status) => {
 const tags = {
 pending: 'warning',
 processing: 'info',
 completed: 'success',
 urgent: 'danger'
 };
 return tags[status] || 'default';
};
const getStatusName = (status) => {
 const names = {
 pending: '待处理',
 processing: '处理中',
 completed: '已完成',
 urgent: '加急'
 };
 return names[status] || status;
};
const handleSearch = () => {
};
const viewOrder = (order) => {
 selectedOrder.value = order;
 showDetailModal.value = true;
};
const createComm = (order) => {
 selectedOrder.value = order;
 showCommModal.value = true;
};
const handleCreateOrder = async () => {
 try {
 await orderAPI.create(orderForm);
 ElMessage.success('订单创建成功');
 showCreateModal.value = false;
 loadOrders();
 }
 catch (error) {
 ElMessage.error(error.response?.data?.message || '创建失败');
 }
};
const handleCreateComm = async () => {
 try {
 await communicationAPI.create({
 order_id: selectedOrder.value.id,
 receiver_group: selectedOrder.value.lab_group,
 type: commForm.type,
 content: commForm.content
 });
 ElMessage.success('沟通请求已发送');
 showCommModal.value = false;
 commForm.type = '';
 commForm.content = '';
 }
 catch (error) {
 ElMessage.error(error.response?.data?.message || '发送失败');
 }
};
const loadOrders = async () => {
 try {
 const response = await orderAPI.getAll();
 orders.value = response.data.map(o => ({
 ...o,
 deadline: o.deadline ? new Date(o.deadline).toLocaleString() : '-',
 created_at: new Date(o.created_at).toLocaleString()
 }));
 }
 catch (error) {
 console.error(error);
 }
};
onMounted(() => {
 loadOrders();
});
</script>

<style scoped>
.orders-container {
  display: flex;
  min-height: 100vh;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  color: white;
  z-index: 100;
}

.header-left h1 {
  font-size: 18px;
  font-weight: 600;
}

.sidebar {
  margin-top: 60px;
  width: 200px;
  background: #f5f5f5;
  min-height: calc(100vh - 60px);
  padding-top: 20px;
}

.sidebar-menu {
  border-right: none;
}

.main-content {
  margin-top: 60px;
  flex: 1;
  padding: 20px;
}

.filter-bar {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.el-table {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
</style>