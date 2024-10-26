export const users = [
  {
    username: 'user6474',
    room_id: 'fef286c5-c045-4ea8-b3d5-9a46df17edd3',
    first_name: 'John',
    last_name: 'Garcia',
    avatar: 'https://static.vecteezy.com/system/resources/thumbnails/001/993/889/small_2x/beautiful-latin-woman-avatar-character-icon-free-vector.jpg'
  },
  {
    username: 'user6921',
    room_id: 'fef286c5-c045-4ea8-b3d5-9a46df17edd3',
    first_name: 'David',
    last_name: 'Davis',
    avatar: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRz2P9ibPv2s1A2dqN9uq6Tdh4V1J4F24Uu2zTeVAQXS4XUnurEERLeYG-Mf-VataDYTJw&usqp=CAU'
  },
  {
    username: 'user2097',
    room_id: '8014f9e8-d4ac-45e3-9cbd-7ff3f0613ce3',
    first_name: 'Isabella',
    last_name: 'Rodriguez',
    avatar: 'https://png.pngtree.com/png-clipart/20231019/original/pngtree-user-profile-avatar-png-image_13369988.png'
  },
  {
    username: 'user7160',
    room_id: '8014f9e8-d4ac-45e3-9cbd-7ff3f0613ce3',
    first_name: 'Olivia',
    last_name: 'Garcia',
    avatar: 'https://png.pngtree.com/png-clipart/20230927/original/pngtree-man-avatar-image-for-profile-png-image_13001877.png'
  },
  {
    username: 'user9877',
    room_id: 'e7ebcf83-04f9-49b3-8aa1-16a75e3583b6',
    first_name: 'James',
    last_name: 'Johnson',
    avatar: 'https://png.pngtree.com/png-clipart/20230927/original/pngtree-man-avatar-image-for-profile-png-image_13001884.png'
  },
  {
    username: 'user3515',
    room_id: 'e7ebcf83-04f9-49b3-8aa1-16a75e3583b6',
    first_name: 'Timaya',
    last_name: 'Davos',
    avatar: 'https://png.pngtree.com/png-clipart/20230930/original/pngtree-man-avatar-isolated-png-image_13022161.png'
  },
  {
    username: 'user6168',
    room_id: 'df7018e5-bb55-4951-8396-95c76b59f8da',
    first_name: 'Sophia',
    last_name: 'Brown',
    avatar: 'https://png.pngtree.com/png-clipart/20231020/original/pngtree-avatar-of-a-brunette-man-png-image_13379740.png'
  },
  {
    username: 'user2998',
    room_id: 'df7018e5-bb55-4951-8396-95c76b59f8da',
    first_name: 'Robert',
    last_name: 'Martinez',
    avatar: 'https://t3.ftcdn.net/jpg/06/17/13/26/360_F_617132669_YptvM7fIuczaUbYYpMe3VTLimwZwzlWf.jpg'
  },
  {
    username: 'user1096',
    room_id: '826c2deb-3f10-42ad-96ac-9e98000cceb2',
    first_name: 'Olivia',
    last_name: 'Miller',
    avatar: 'https://t3.ftcdn.net/jpg/08/70/11/96/360_F_870119680_oiSzMce4HSWmFRvLNA4G0WwmpS8q87BC.jpg'
  },
  {
    username: 'user7740',
    room_id: '826c2deb-3f10-42ad-96ac-9e98000cceb2',
    first_name: 'Emma',
    last_name: 'Williams',
    avatar: 'https://img.freepik.com/free-photo/portrait-beautiful-business-woman-suit-3d-rendering_1142-40685.jpg'
  },
]

export const findUsername = (username: string | any) => {
  return users?.find((item) => item?.username === username);
};