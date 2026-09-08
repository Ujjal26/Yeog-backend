/**
 * @file socket.js
 * @description Real-time WebSocket server setup using Socket.IO.
 * Handles socket authentication (admin vs customer table tokens), room management (`admin_room`, `table_<number>`),
 * real-time order placement, status updates, bill payment completion, and DB updates.
 */

const Table = require('../models/Table');
const Order = require('../models/Order');
const OrderData = require('../models/OrderData');
const jwt = require('jsonwebtoken');

// Validate JWT Secret for Socket authentication
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set.');


/**
 * Initializes Socket.IO authentication middleware and connection listeners.
 * 
 * @function setupWebSocket
 * @param {import('socket.io').Server} io - Socket.IO server instance.
 * @returns {void}
 */
module.exports = function (io) {
  /**
   * Socket Authentication Middleware.
   * Extracts JWT token from `socket.handshake.auth.token`, verifies signature,
   * and attaches role properties (`socket.isAdmin = true` or `socket.customerTable = tableNumber`).
   */
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role === 'admin' || decoded.username === 'admin') {
        // Verified admin token
        socket.isAdmin = true;
      } else {
        // Verified customer token — attach the table number from the token payload
        socket.customerTable = decoded.tableNumber;
      }

      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle client connections
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    /**
     * Helper function to query rooms matching `table_<number>`
     * and retrieve an array of currently active table numbers.
     * 
     * @returns {number[]} Array of active table numbers.
     */
    const getActiveTables = () => {
      const active = [];
      for (const [roomName, clients] of io.sockets.adapter.rooms.entries()) {
        if (roomName.startsWith('table_') && clients.size > 0) {
          const tableNo = parseInt(roomName.replace('table_', ''), 10);
          if (!isNaN(tableNo)) {
            active.push(tableNo);
          }
        }
      }
      return active;
    };

    // Auto-join admin room if token was verified as admin
    if (socket.isAdmin) {
      socket.join('admin_room');
      console.log(`Admin joined (Socket: ${socket.id})`);
      // Send current list of active tables to newly connected admin
      socket.emit('active_tables', getActiveTables());
    }

    // Auto-join customer table room if token belongs to a customer
    if (socket.customerTable) {
      const tableNo = socket.customerTable;
      socket.join(`table_${tableNo}`);
      console.log(`Table ${tableNo} joined (Socket: ${socket.id})`);
      
      // Update table status in MongoDB to 'active'
      Table.findOneAndUpdate({ number: Number(tableNo) }, { status: 'active' }, { new: true })
        .then(() => console.log(`DB Updated: Table ${tableNo} is active`))
        .catch(console.error);

      // Notify all admin sockets that a customer joined a table
      io.to('admin_room').emit('new_table_joined', {
        tableId: tableNo,
        socketId: socket.id,
      });
    }

    /**
     * Event: `join_table` (Backup/Legacy table join event handler)
     */
    socket.on('join_table', () => {
      if (socket.customerTable) {
        const tableId = socket.customerTable;
        socket.join(`table_${tableId}`);
        console.log(`Table ${tableId} joined via event (Socket: ${socket.id})`);
        
        // Update DB table status to 'active'
        Table.findOneAndUpdate({ number: Number(tableId) }, { status: 'active' }, { new: true })
          .then(() => console.log(`DB Updated: Table ${tableId} is active`))
          .catch(console.error);
      }
    });

    /**
     * Event: `join_admin` (Admin join fallback event handler)
     */
    socket.on('join_admin', () => {
      if (!socket.isAdmin) {
        console.warn(`Blocked unauthorized join_admin attempt from Socket: ${socket.id}`);
        return;
      }
      socket.join('admin_room');
      console.log(`Admin joined via event (Socket: ${socket.id})`);
      socket.emit('active_tables', getActiveTables());
    });

    /**
     * Event: `new_order`
     * Customer places an order. Validates socket ownership & active table status,
     * saves order to MongoDB, and broadcasts to admin dashboard.
     */
    socket.on('new_order', async (order) => {
      console.log(`New order received: ${order.id} from Table ${order.tableNumber}`);

      // Security check: Ensure order table matches socket's authorized table
      if (order.tableNumber !== socket.customerTable) {
        console.warn(`Blocked order: Socket table ${socket.customerTable} tried to order for Table ${order.tableNumber}`);
        socket.emit('order_error', { message: 'Table mismatch: cannot place orders for another table' });
        return;
      }

      // Security check: Ensure table exists and is active
      const table = await Table.findOne({ number: order.tableNumber });
      if (!table || table.status !== 'active') {
        console.warn(`Blocked order from Table ${order.tableNumber} (status: ${table?.status})`);
        socket.emit('order_error', { message: 'Table is not active' });
        return;
      }
      
      // Persist order document in DB
      try {
        const newOrder = new Order({
          id: order.id,
          tableNumber: order.tableNumber,
          items: order.items,
          total: order.total,
          status: order.status,
          timestamp: order.timestamp,
        });
        await newOrder.save();

        // Also persist each line item to OrderData for sales analytics
        if (Array.isArray(order.items) && order.items.length > 0) {
          const orderDataDocs = order.items.map((item) => ({
            order: item.name || item.id,
            quantity: Number(item.qty) || 1,
            amount: Number(item.price) || 0, // Unit price only as specified
            timestamp: order.timestamp || new Date().toLocaleString(),
          }));
          await OrderData.insertMany(orderDataDocs);
        }
      } catch (err) {
        console.error('Failed to save order or order data to DB:', err);
      }


      // Broadcast order ticket to kitchen/admin room
      io.to('admin_room').emit('order_received', order);
    });

    /**
     * Event: `update_order_status`
     * Admin updates order status (e.g. 'Received' -> 'Served').
     * Updates order document in DB, notifies table room, and synchronizes other admins.
     */
    socket.on('update_order_status', async (data) => {
      if (!socket.isAdmin) {
        console.warn(`Blocked update_order_status from non-admin Socket: ${socket.id}`);
        return;
      }
      const { orderId, tableNumber, status } = data;
      console.log(`Order ${orderId} status → ${status}`);
      
      try {
        await Order.findOneAndUpdate({ id: orderId }, { status });
      } catch (err) {
        console.error('Failed to update order status in DB:', err);
      }

      // Notify customer table of order status change
      io.to(`table_${tableNumber}`).emit('order_status_updated', {
        orderId,
        status,
      });
      // Synchronize order status change across all admin screens
      socket.to('admin_room').emit('order_status_changed', {
        orderId,
        status,
      });
    });

    /**
     * Event: `payment_done`
     * Admin completes payment settlement for a table.
     * Notifies customer table, disconnects customer sockets, marks table 'available' in DB,
     * deletes table orders, and updates active table count.
     */
    socket.on('payment_done', async (tableNumber) => {
      if (!socket.isAdmin) {
        console.warn(`Blocked payment_done from non-admin Socket: ${socket.id}`);
        return;
      }
      console.log(`Payment done for Table ${tableNumber} — disconnecting table`);
      
      // Notify customer table room that table session is closed
      io.to(`table_${tableNumber}`).emit('table_closed');
      
      // Notify admin room to update UI
      io.to('admin_room').emit('table_closed', tableNumber);

      // Forcefully disconnect all customer sockets connected to this table room
      io.in(`table_${tableNumber}`).disconnectSockets(true);

      try {
        // Reset table status to 'available'
        await Table.findOneAndUpdate({ number: Number(tableNumber) }, { status: 'available' }, { new: true });
        console.log(`DB Updated: Table ${tableNumber} is available`);
        
        // Remove completed orders for this table
        await Order.deleteMany({ tableNumber: Number(tableNumber) });
        console.log(`DB Cleared: Orders for Table ${tableNumber} deleted`);

        // Emit updated list of active tables to admin room
        io.to('admin_room').emit('active_tables', getActiveTables());
      } catch (err) {
        console.error('Error on payment completion (Table or Orders update):', err);
      }
    });

    /**
     * Event: `disconnect`
     * Handles socket disconnect events.
     */
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });
};

