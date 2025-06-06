import { User } from '../models/user.model';
import mongoose from 'mongoose';

export class FriendService {
  static async sendFriendRequest(senderId: string, receiverId: string) {
    console.log('FriendService: Starting sendFriendRequest', { senderId, receiverId });
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      console.error('Invalid user IDs:', { senderId, receiverId });
      throw new Error('Invalid user ID');
    }
    // Check if users exist
    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId)
    ]);
    console.log('Found users:', {
      sender: sender ? { id: sender._id, name: sender.username } : null,
      receiver: receiver ? { id: receiver._id, name: receiver.username } : null
    });
    if (!sender || !receiver) {
      console.error('User not found:', { senderExists: !!sender, receiverExists: !!receiver });
      throw new Error('User not found');
    }
    console.log('Before mutation:', {
      senderSentRequests: sender.sentRequests.map(id => id.toString()),
      senderFriends: sender.friends.map(id => id.toString()),
      receiverReceivedRequests: receiver.receivedRequests.map(id => id.toString()),
      receiverFriends: receiver.friends.map(id => id.toString())
    });
    // Check if request already exists
    if (sender.sentRequests.includes(receiver._id) || 
        receiver.receivedRequests.includes(sender._id)) {
      throw new Error('Friend request already sent');
    }

    // Check if they are already friends
    if (sender.friends.includes(receiver._id)) {
      throw new Error('Users are already friends');
    }

    // Add request to both users
    sender.sentRequests.push(receiver._id);
    receiver.receivedRequests.push(sender._id);

    // Save both users
    await Promise.all([sender.save(), receiver.save()]);
    console.log('After mutation:', {
      senderSentRequests: sender.sentRequests.map(id => id.toString()),
      senderFriends: sender.friends.map(id => id.toString()),
      receiverReceivedRequests: receiver.receivedRequests.map(id => id.toString()),
      receiverFriends: receiver.friends.map(id => id.toString())
    });
    return { message: 'Friend request sent successfully' };
  }

  static async acceptFriendRequest(userId: string, requesterId: string) {
    console.log('FriendService: Starting acceptFriendRequest', { userId, requesterId });
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(requesterId)) {
      console.error('Invalid user IDs:', { userId, requesterId });
      throw new Error('Invalid user ID');
    }
    // Check if users exist
    const [user, requester] = await Promise.all([
      User.findById(userId),
      User.findById(requesterId)
    ]);
    console.log('Found users:', {
      user: user ? { id: user._id, name: user.username } : null,
      requester: requester ? { id: requester._id, name: requester.username } : null
    });
    if (!user || !requester) {
      console.error('User not found:', { userExists: !!user, requesterExists: !!requester });
      throw new Error('User not found');
    }
    console.log('Before mutation:', {
      userReceivedRequests: user.receivedRequests.map(id => id.toString()),
      userFriends: user.friends.map(id => id.toString()),
      requesterSentRequests: requester.sentRequests.map(id => id.toString()),
      requesterFriends: requester.friends.map(id => id.toString())
    });
    // Verify request exists in both directions
    const requestExistsInReceiver = user.receivedRequests.some(id => id.equals(requester._id));
    const requestExistsInSender = requester.sentRequests.some(id => id.equals(user._id));

    console.log('Request verification:', {
      requestExistsInReceiver,
      requestExistsInSender,
      userReceivedRequests: user.receivedRequests.map(id => id.toString()),
      requesterSentRequests: requester.sentRequests.map(id => id.toString())
    });

    if (!requestExistsInReceiver || !requestExistsInSender) {
      console.error('Friend request not found in both directions');
      throw new Error('Friend request not found');
    }

    // Check if they are already friends
    const alreadyFriends = user.friends.some(id => id.equals(requester._id)) ||
                          requester.friends.some(id => id.equals(user._id));
    
    console.log('Friendship check:', { alreadyFriends });

    if (alreadyFriends) {
      console.error('Users are already friends');
      throw new Error('Users are already friends');
    }

    // Remove request from both users
    user.receivedRequests = user.receivedRequests.filter(id => !id.equals(requester._id));
    requester.sentRequests = requester.sentRequests.filter(id => !id.equals(user._id));

    // Add each user to the other's friends list
    user.friends.push(requester._id);
    requester.friends.push(user._id);

    console.log('Updating user records:', {
      userFriends: user.friends.map(id => id.toString()),
      requesterFriends: requester.friends.map(id => id.toString())
    });

    // Save both users
    await Promise.all([user.save(), requester.save()]);
    console.log('After mutation:', {
      userReceivedRequests: user.receivedRequests.map(id => id.toString()),
      userFriends: user.friends.map(id => id.toString()),
      requesterSentRequests: requester.sentRequests.map(id => id.toString()),
      requesterFriends: requester.friends.map(id => id.toString())
    });
    console.log('Friend request accepted successfully');
    return { message: 'Friend request accepted' };
  }

  static async declineFriendRequest(userId: string, requesterId: string) {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(requesterId)) {
      throw new Error('Invalid user ID');
    }

    // Check if users exist
    const [user, requester] = await Promise.all([
      User.findById(userId),
      User.findById(requesterId)
    ]);

    if (!user || !requester) {
      throw new Error('User not found');
    }

    // Remove request from both users
    user.receivedRequests = user.receivedRequests.filter(id => !id.equals(requester._id));
    requester.sentRequests = requester.sentRequests.filter(id => !id.equals(user._id));

    // Save both users
    await Promise.all([user.save(), requester.save()]);

    return { message: 'Friend request declined' };
  }

  static async getFriendsList(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(userId).populate('friends', 'username email profileImage bio interests');
    
    if (!user) {
      throw new Error('User not found');
    }

    return user.friends;
  }

  static async getFriendRequests(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(userId)
      .populate('receivedRequests', 'username email profileImage bio interests')
      .populate('sentRequests', 'username email profileImage bio interests');
    
    if (!user) {
      throw new Error('User not found');
    }

    return {
      received: user.receivedRequests,
      sent: user.sentRequests
    };
  }
} 